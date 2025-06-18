import pandas as pd
import json
import os
from typing import Dict, Any, List
import uuid
from sqlalchemy.orm import Session
from models import UploadedFile, SemanticModel
import PyPDF2
import docx
import numpy as np

class FileProcessorService:
    def __init__(self):
        self.supported_types = {
            'csv': self._process_csv,
            'xlsx': self._process_excel,
            'xls': self._process_excel,
            'json': self._process_json,
            'pdf': self._process_pdf,
            'docx': self._process_docx,
            'txt': self._process_text
        }
    
    async def process_file(self, file_id: str, file_path: str, file_type: str):
        """Process uploaded file and extract data"""
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            # Get file record
            file_record = db.query(UploadedFile).filter(
                UploadedFile.id == file_id
            ).first()
            
            if not file_record:
                return
            
            # Update status to processing
            file_record.processing_status = "processing"
            db.commit()
            
            # Process file based on type
            processor = self.supported_types.get(file_type.lower())
            if not processor:
                file_record.processing_status = "failed"
                db.commit()
                return
            
            try:
                extracted_data = processor(file_path)
                
                # Update file record with extracted data
                file_record.extracted_data = extracted_data
                file_record.processing_status = "completed"
                file_record.metadata = {
                    "rows": len(extracted_data.get('rows', [])),
                    "columns": len(extracted_data.get('columns', [])),
                    "data_types": extracted_data.get('data_types', {}),
                    "file_info": extracted_data.get('file_info', {})
                }
                
                db.commit()
                
            except Exception as e:
                file_record.processing_status = "failed"
                file_record.metadata = {"error": str(e)}
                db.commit()
                
        finally:
            db.close()
    
    def _process_csv(self, file_path: str) -> Dict[str, Any]:
        """Process CSV file"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Could not read CSV file with any supported encoding")
            
            return self._dataframe_to_dict(df)
            
        except Exception as e:
            raise Exception(f"Error processing CSV: {str(e)}")
    
    def _process_excel(self, file_path: str) -> Dict[str, Any]:
        """Process Excel file"""
        try:
            # Read first sheet
            df = pd.read_excel(file_path, sheet_name=0)
            return self._dataframe_to_dict(df)
            
        except Exception as e:
            raise Exception(f"Error processing Excel: {str(e)}")
    
    def _process_json(self, file_path: str) -> Dict[str, Any]:
        """Process JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # If data is a list of objects, convert to DataFrame
            if isinstance(data, list) and all(isinstance(item, dict) for item in data):
                df = pd.DataFrame(data)
                return self._dataframe_to_dict(df)
            
            # If data is a single object, treat as one row
            elif isinstance(data, dict):
                df = pd.DataFrame([data])
                return self._dataframe_to_dict(df)
            
            # Otherwise, return as text content
            else:
                return {
                    "type": "text",
                    "content": json.dumps(data, indent=2),
                    "file_info": {"original_type": "json"}
                }
                
        except Exception as e:
            raise Exception(f"Error processing JSON: {str(e)}")
    
    def _process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF file"""
        try:
            text_content = ""
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
            
            return {
                "type": "text",
                "content": text_content,
                "file_info": {
                    "pages": len(pdf_reader.pages),
                    "original_type": "pdf"
                }
            }
            
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
    
    def _process_docx(self, file_path: str) -> Dict[str, Any]:
        """Process Word document"""
        try:
            doc = docx.Document(file_path)
            text_content = ""
            
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
            
            return {
                "type": "text",
                "content": text_content,
                "file_info": {
                    "paragraphs": len(doc.paragraphs),
                    "original_type": "docx"
                }
            }
            
        except Exception as e:
            raise Exception(f"Error processing DOCX: {str(e)}")
    
    def _process_text(self, file_path: str) -> Dict[str, Any]:
        """Process text file"""
        try:
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            content = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                raise ValueError("Could not read text file with any supported encoding")
            
            return {
                "type": "text",
                "content": content,
                "file_info": {
                    "length": len(content),
                    "lines": len(content.split('\n')),
                    "original_type": "txt"
                }
            }
            
        except Exception as e:
            raise Exception(f"Error processing text file: {str(e)}")
    
    def _dataframe_to_dict(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Convert DataFrame to dictionary format"""
        # Clean the dataframe
        df = self._clean_dataframe(df)
        
        # Get column info
        columns = []
        data_types = {}
        
        for col in df.columns:
            col_type = self._infer_column_type(df[col])
            columns.append({
                "name": str(col),
                "type": col_type
            })
            data_types[str(col)] = col_type
        
        # Convert to records
        rows = df.to_dict('records')
        
        # Handle NaN values
        for row in rows:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None
                elif isinstance(value, (np.int64, np.int32)):
                    row[key] = int(value)
                elif isinstance(value, (np.float64, np.float32)):
                    row[key] = float(value)
        
        return {
            "type": "tabular",
            "columns": columns,
            "rows": rows,
            "row_count": len(df),
            "column_count": len(df.columns),
            "data_types": data_types,
            "file_info": {
                "shape": df.shape,
                "memory_usage": df.memory_usage(deep=True).sum()
            }
        }
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and prepare dataframe"""
        # Remove completely empty rows and columns
        df = df.dropna(how='all').dropna(axis=1, how='all')
        
        # Convert column names to strings
        df.columns = [str(col) for col in df.columns]
        
        # Handle duplicate column names
        df.columns = pd.io.common.dedup_names(df.columns, is_potential_multiindex=False)
        
        return df
    
    def _infer_column_type(self, series: pd.Series) -> str:
        """Infer the type of a pandas Series"""
        if pd.api.types.is_numeric_dtype(series):
            if pd.api.types.is_integer_dtype(series):
                return "integer"
            else:
                return "number"
        elif pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        elif pd.api.types.is_bool_dtype(series):
            return "boolean"
        else:
            return "string"
    
    async def create_semantic_model(self, extracted_data: Dict[str, Any], model_name: str) -> SemanticModel:
        """Create a semantic model from extracted data"""
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            if extracted_data.get("type") != "tabular":
                raise ValueError("Can only create semantic models from tabular data")
            
            # Generate schema definition
            schema_definition = {
                "tables": {
                    "main_table": {
                        "sql": "SELECT * FROM uploaded_data",
                        "columns": {}
                    }
                },
                "metrics": [],
                "dimensions": [],
                "joins": []
            }
            
            # Add columns
            for col in extracted_data.get("columns", []):
                col_name = col["name"]
                col_type = col["type"]
                
                schema_definition["tables"]["main_table"]["columns"][col_name] = {
                    "type": col_type,
                    "primary": False
                }
                
                # Add as dimension or metric
                if col_type in ["string", "boolean"]:
                    schema_definition["dimensions"].append({
                        "name": col_name.lower().replace(" ", "_"),
                        "title": col_name,
                        "sql": f"main_table.{col_name}",
                        "type": col_type
                    })
                elif col_type in ["number", "integer"]:
                    # Add as both metric and dimension
                    schema_definition["metrics"].append({
                        "name": f"sum_{col_name.lower().replace(' ', '_')}",
                        "title": f"Total {col_name}",
                        "type": "sum",
                        "sql": f"SUM(main_table.{col_name})",
                        "format": "number"
                    })
                    
                    schema_definition["dimensions"].append({
                        "name": col_name.lower().replace(" ", "_"),
                        "title": col_name,
                        "sql": f"main_table.{col_name}",
                        "type": col_type
                    })
            
            # Create semantic model
            semantic_model = SemanticModel(
                name=model_name,
                description=f"Auto-generated semantic model for {model_name}",
                schema_definition=schema_definition
            )
            
            db.add(semantic_model)
            db.commit()
            db.refresh(semantic_model)
            
            return semantic_model
            
        finally:
            db.close()