import pandas as pd
import sqlite3
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from models import UploadedFile, SemanticModel

class QueryEngine:
    def __init__(self):
        self.temp_db_path = "temp_query.db"
    
    async def execute_query(
        self,
        sql: str,
        model_id: Optional[str],
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Execute SQL query against user's data"""
        
        try:
            # Get user's data
            if model_id:
                # Query using semantic model
                model = db.query(SemanticModel).filter(
                    SemanticModel.id == model_id
                ).first()
                
                if not model:
                    raise ValueError("Semantic model not found")
                
                # For now, we'll use the first available file
                # In a real implementation, you'd map the model to specific data sources
                user_files = db.query(UploadedFile).filter(
                    UploadedFile.user_id == user_id,
                    UploadedFile.processing_status == "completed"
                ).all()
                
                if not user_files:
                    raise ValueError("No processed data files found")
                
                data_source = user_files[0].extracted_data
            else:
                # Query against first available file
                user_file = db.query(UploadedFile).filter(
                    UploadedFile.user_id == user_id,
                    UploadedFile.processing_status == "completed"
                ).first()
                
                if not user_file:
                    raise ValueError("No processed data files found")
                
                data_source = user_file.extracted_data
            
            # Execute query against the data
            result = await self._execute_sql_on_data(sql, data_source)
            
            return result
            
        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")
    
    async def _execute_sql_on_data(self, sql: str, data_source: Dict[str, Any]) -> Dict[str, Any]:
        """Execute SQL on extracted data"""
        
        if data_source.get("type") != "tabular":
            raise ValueError("Can only query tabular data")
        
        rows = data_source.get("rows", [])
        if not rows:
            raise ValueError("No data available to query")
        
        # Create DataFrame
        df = pd.DataFrame(rows)
        
        # Create temporary SQLite database
        conn = sqlite3.connect(":memory:")
        
        try:
            # Load data into SQLite
            df.to_sql("data", conn, if_exists="replace", index=False)
            
            # Execute SQL query
            cursor = conn.cursor()
            
            # Replace common table references with 'data'
            modified_sql = self._modify_sql_for_execution(sql)
            
            cursor.execute(modified_sql)
            
            # Get column names
            columns = [description[0] for description in cursor.description]
            
            # Fetch results
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            result_data = []
            for row in rows:
                result_data.append({
                    columns[i]: self._convert_sql_value(row[i])
                    for i in range(len(columns))
                })
            
            # Prepare column metadata
            column_metadata = [
                {"name": col, "type": self._infer_column_type(result_data, col)}
                for col in columns
            ]
            
            return {
                "data": result_data,
                "columns": column_metadata
            }
            
        finally:
            conn.close()
    
    def _modify_sql_for_execution(self, sql: str) -> str:
        """Modify SQL query to work with our data table"""
        
        # Simple replacements for common table names
        replacements = [
            ("orders", "data"),
            ("customers", "data"),
            ("sales", "data"),
            ("products", "data"),
            ("uploaded_data", "data"),
            ("main_table", "data")
        ]
        
        modified_sql = sql
        for old, new in replacements:
            modified_sql = modified_sql.replace(old, new)
        
        return modified_sql
    
    def _convert_sql_value(self, value):
        """Convert SQL result values to JSON-serializable types"""
        if value is None:
            return None
        elif isinstance(value, (int, float, str, bool)):
            return value
        else:
            return str(value)
    
    def _infer_column_type(self, data: List[Dict], column: str) -> str:
        """Infer column type from result data"""
        if not data:
            return "string"
        
        sample_value = None
        for row in data:
            if row.get(column) is not None:
                sample_value = row[column]
                break
        
        if sample_value is None:
            return "string"
        elif isinstance(sample_value, bool):
            return "boolean"
        elif isinstance(sample_value, int):
            return "integer"
        elif isinstance(sample_value, float):
            return "number"
        else:
            return "string"