import pandas as pd
import pdfplumber
import docx
import json
import os
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from models import UploadedFile, SemanticModel
import uuid

class FileProcessorService:
    def __init__(self):
        self.supported_types = {
            'csv': self._process_csv,
            'xlsx': self._process_excel,
            'xls': self._process_excel,
            'pdf': self._process_pdf,
            'docx': self._process_docx,
            'txt': self._process_txt
        }
    
    async def process_file(self, file_id: str, file_path: str, file_type: str):
        """Process uploaded file and extract data"""
        db = SessionLocal()
        try:
            # Update status to processing
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if not file_record:
                return
            
            file_record.processing_status = "processing"
            db.commit()
            
            # Process based on file type
            if file_type in self.supported_types:
                extracted_data = await self.supported_types[file_type](file_path)
                
                # Store extracted data
                file_record.extracted_data = extracted_data
                file_record.processing_status = "completed"
            else:
                file_record.processing_status = "failed"
                
            db.commit()
            
        except Exception as e:
            file_record.processing_status = "failed"
            db.commit()
            print(f"Error processing file {file_id}: {str(e)}")
        finally:
            db.close()
    
    async def _process_csv(self, file_path: str) -> Dict[str, Any]:
        """Process CSV file"""
        df = pd.read_csv(file_path)
        return self._dataframe_to_dict(df)
    
    async def _process_excel(self, file_path: str) -> Dict[str, Any]:
        """Process Excel file"""
        # Read all sheets
        excel_file = pd.ExcelFile(file_path)
        sheets_data = {}
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            sheets_data[sheet_name] = self._dataframe_to_dict(df)
        
        # If only one sheet, return its data directly
        if len(sheets_data) == 1:
            return list(sheets_data.values())[0]
        
        return {
            "type": "multi_sheet",
            "sheets": sheets_data
        }
    
    async def _process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF file - extract text and try to find tables"""
        text_content = []
        tables = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                text = page.extract_text()
                if text:
                    text_content.append({
                        "page": page_num + 1,
                        "text": text
                    })
                
                # Try to extract tables
                page_tables = page.extract_tables()
                for table_num, table in enumerate(page_tables):
                    if table:
                        # Convert table to DataFrame
                        df = pd.DataFrame(table[1:], columns=table[0])
                        tables.append({
                            "page": page_num + 1,
                            "table": table_num + 1,
                            "data": self._dataframe_to_dict(df)
                        })
        
        return {
            "type": "pdf",
            "text_content": text_content,
            "tables": tables
        }
    
    async def _process_docx(self, file_path: str) -> Dict[str, Any]:
        """Process DOCX file"""
        doc = docx.Document(file_path)
        
        # Extract text
        text_content = []
        for para in doc.paragraphs:
            if para.text.strip():
                text_content.append(para.text)
        
        # Extract tables
        tables = []
        for table_num, table in enumerate(doc.tables):
            table_data = []
            for row in table.rows:
                row_data = [cell.text for cell in row.cells]
                table_data.append(row_data)
            
            if table_data:
                df = pd.DataFrame(table_data[1:], columns=table_data[0])
                tables.append({
                    "table": table_num + 1,
                    "data": self._dataframe_to_dict(df)
                })
        
        return {
            "type": "docx",
            "text_content": text_content,
            "tables": tables
        }
    
    async def _process_txt(self, file_path: str) -> Dict[str, Any]:
        """Process TXT file"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Try to detect if it's structured data (CSV-like)
        lines = content.split('\n')
        if len(lines) > 1:
            # Check if it looks like CSV
            first_line = lines[0]
            if ',' in first_line or '\t' in first_line:
                try:
                    # Try to parse as CSV
                    df = pd.read_csv(file_path, sep=',' if ',' in first_line else '\t')
                    return self._dataframe_to_dict(df)
                except:
                    pass
        
        return {
            "type": "text",
            "content": content,
            "lines": lines
        }
    
    def _dataframe_to_dict(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Convert DataFrame to structured dictionary"""
        # Clean the dataframe
        df = df.dropna(how='all')  # Remove empty rows
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]  # Remove unnamed columns
        
        # Infer column types
        columns_info = []
        for col in df.columns:
            col_type = "string"
            if pd.api.types.is_numeric_dtype(df[col]):
                col_type = "number"
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_type = "datetime"
            elif pd.api.types.is_bool_dtype(df[col]):
                col_type = "boolean"
            
            columns_info.append({
                "name": str(col),
                "type": col_type,
                "nullable": df[col].isnull().any(),
                "unique_values": df[col].nunique() if col_type == "string" else None
            })
        
        # Convert to records
        records = df.to_dict('records')
        
        return {
            "type": "tabular",
            "columns": columns_info,
            "rows": records,
            "row_count": len(records),
            "column_count": len(columns_info)
        }
    
    async def create_semantic_model(self, extracted_data: Dict[str, Any], model_name: str) -> SemanticModel:
        """Create semantic model from extracted data"""
        db = SessionLocal()
        try:
            # Generate semantic model schema
            schema_definition = self._generate_semantic_schema(extracted_data, model_name)
            
            # Create semantic model
            semantic_model = SemanticModel(
                name=model_name,
                description=f"Auto-generated model from uploaded data",
                schema_definition=schema_definition
            )
            
            db.add(semantic_model)
            db.commit()
            db.refresh(semantic_model)
            
            return semantic_model
            
        finally:
            db.close()
    
    def _generate_semantic_schema(self, extracted_data: Dict[str, Any], model_name: str) -> Dict[str, Any]:
        """Generate semantic model schema from extracted data"""
        if extracted_data.get("type") == "tabular":
            columns = extracted_data.get("columns", [])
            
            # Generate metrics (numeric columns)
            metrics = []
            dimensions = []
            
            for col in columns:
                if col["type"] == "number":
                    metrics.extend([
                        {
                            "name": f"sum_{col['name'].lower()}",
                            "title": f"Total {col['name']}",
                            "type": "sum",
                            "sql": f"SUM({col['name']})",
                            "format": "number"
                        },
                        {
                            "name": f"avg_{col['name'].lower()}",
                            "title": f"Average {col['name']}",
                            "type": "avg",
                            "sql": f"AVG({col['name']})",
                            "format": "number"
                        }
                    ])
                else:
                    dimensions.append({
                        "name": col['name'].lower(),
                        "title": col['name'],
                        "sql": col['name'],
                        "type": col['type']
                    })
            
            # Add count metric
            metrics.append({
                "name": "record_count",
                "title": "Record Count",
                "type": "count",
                "sql": "COUNT(*)",
                "format": "number"
            })
            
            return {
                "tables": {
                    model_name.lower(): {
                        "sql": f"SELECT * FROM {model_name.lower()}",
                        "columns": {col["name"]: {"type": col["type"]} for col in columns}
                    }
                },
                "metrics": metrics,
                "dimensions": dimensions
            }
        
        return {"tables": {}, "metrics": [], "dimensions": []}