from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import os
import uuid
import aiofiles
import json
from datetime import datetime
import asyncio
import pandas as pd

from database import get_db
from models import UploadedFile, SemanticModel, Query, Dashboard
from schemas import FileUploadResponse, FileListResponse, FileProcessingStatus
from services.file_processor import FileProcessorService
from services.data_source_registry import DataSourceRegistry
from services.notification_service import NotificationService
from auth import get_current_active_user, User

router = APIRouter()
file_processor = FileProcessorService()
data_registry = DataSourceRegistry()
notification_service = NotificationService()

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".pdf", ".docx", ".txt", ".json"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

class EnhancedFileService:
    """Enhanced file service with cross-feature integration"""
    
    def __init__(self):
        self.file_processor = FileProcessorService()
        self.data_registry = DataSourceRegistry()
        self.notification_service = NotificationService()
    
    async def process_and_integrate_file(self, file_id: str, file_path: str, file_type: str, user_id: str):
        """Process file and integrate with all platform features"""
        try:
            print(f"Starting enhanced processing for file {file_id}")
            
            # Step 1: Process the file
            extracted_data = await self.file_processor.process_file(file_id, file_path, file_type)
            
            # Step 2: Create semantic model automatically for tabular data
            semantic_model = None
            if extracted_data.get("type") == "tabular":
                semantic_model = await self._create_automatic_semantic_model(
                    file_id, extracted_data, user_id
                )
            
            # Step 3: Register data source for cross-feature access
            await self._register_data_source(file_id, extracted_data, semantic_model, user_id)
            
            # Step 4: Update query builder schemas
            await self._update_query_builder_schemas(file_id, extracted_data, semantic_model)
            
            # Step 5: Notify conversational AI of new data source
            await self._notify_conversational_ai(file_id, extracted_data, semantic_model)
            
            # Step 6: Update dashboard builder data sources
            await self._update_dashboard_sources(file_id, extracted_data, semantic_model)
            
            # Step 7: Generate initial insights
            await self._generate_initial_insights(file_id, extracted_data, user_id)
            
            print(f"Enhanced processing completed for file {file_id}")
            return True
            
        except Exception as e:
            print(f"Enhanced processing failed for file {file_id}: {str(e)}")
            await self._update_file_status(file_id, "failed", error=str(e))
            return False
    
    async def _create_automatic_semantic_model(self, file_id: str, extracted_data: Dict, user_id: str) -> Optional[SemanticModel]:
        """Automatically create semantic model for tabular data"""
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            # Get file record
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if not file_record:
                return None
            
            model_name = f"auto_{file_record.original_filename}_{file_id[:8]}"
            
            # Generate comprehensive schema definition
            schema_definition = {
                "tables": {
                    "main_table": {
                        "sql": f"SELECT * FROM file_{file_id}",
                        "columns": {},
                        "file_id": file_id,
                        "source_type": "uploaded_file"
                    }
                },
                "metrics": [],
                "dimensions": [],
                "joins": [],
                "data_source": {
                    "type": "file",
                    "file_id": file_id,
                    "user_id": user_id
                }
            }
            
            # Process columns and create metrics/dimensions
            for col in extracted_data.get("columns", []):
                col_name = col["name"]
                col_type = col["type"]
                
                # Add column definition
                schema_definition["tables"]["main_table"]["columns"][col_name] = {
                    "type": col_type,
                    "primary": False,
                    "nullable": col.get("nullable", True)
                }
                
                # Create dimensions for all columns
                dimension = {
                    "name": col_name.lower().replace(" ", "_").replace("-", "_"),
                    "title": col_name,
                    "sql": f"main_table.`{col_name}`",
                    "type": col_type,
                    "original_column": col_name
                }
                schema_definition["dimensions"].append(dimension)
                
                # Create metrics for numeric columns
                if col_type in ["number", "integer", "float"]:
                    # Sum metric
                    schema_definition["metrics"].append({
                        "name": f"sum_{col_name.lower().replace(' ', '_').replace('-', '_')}",
                        "title": f"Total {col_name}",
                        "type": "sum",
                        "sql": f"SUM(main_table.`{col_name}`)",
                        "format": "number",
                        "original_column": col_name
                    })
                    
                    # Average metric
                    schema_definition["metrics"].append({
                        "name": f"avg_{col_name.lower().replace(' ', '_').replace('-', '_')}",
                        "title": f"Average {col_name}",
                        "type": "average",
                        "sql": f"AVG(main_table.`{col_name}`)",
                        "format": "number",
                        "original_column": col_name
                    })
                    
                    # Count metric
                    schema_definition["metrics"].append({
                        "name": f"count_{col_name.lower().replace(' ', '_').replace('-', '_')}",
                        "title": f"Count of {col_name}",
                        "type": "count",
                        "sql": f"COUNT(main_table.`{col_name}`)",
                        "format": "number",
                        "original_column": col_name
                    })
            
            # Add general count metric
            schema_definition["metrics"].append({
                "name": "row_count",
                "title": "Total Rows",
                "type": "count",
                "sql": "COUNT(*)",
                "format": "number"
            })
            
            # Create semantic model
            semantic_model = SemanticModel(
                name=model_name,
                description=f"Auto-generated semantic model for {file_record.original_filename}",
                schema_definition=schema_definition
            )
            
            db.add(semantic_model)
            db.commit()
            db.refresh(semantic_model)
            
            # Update file record with semantic model
            file_record.semantic_model_id = semantic_model.id
            db.commit()
            
            print(f"Created automatic semantic model: {model_name}")
            return semantic_model
            
        except Exception as e:
            print(f"Error creating automatic semantic model: {str(e)}")
            db.rollback()
            return None
        finally:
            db.close()
    
    async def _register_data_source(self, file_id: str, extracted_data: Dict, semantic_model: Optional[SemanticModel], user_id: str):
        """Register data source in central registry for cross-feature access"""
        try:
            data_source_info = {
                "id": file_id,
                "type": "uploaded_file",
                "user_id": user_id,
                "name": extracted_data.get("file_info", {}).get("name", f"File {file_id}"),
                "data_type": extracted_data.get("type", "unknown"),
                "schema": {
                    "columns": extracted_data.get("columns", []),
                    "row_count": len(extracted_data.get("rows", [])),
                    "data_types": extracted_data.get("data_types", {})
                },
                "semantic_model_id": semantic_model.id if semantic_model else None,
                "created_at": datetime.now().isoformat(),
                "status": "available"
            }
            
            await self.data_registry.register_source(file_id, data_source_info)
            print(f"Registered data source: {file_id}")
            
        except Exception as e:
            print(f"Error registering data source: {str(e)}")
    
    async def _update_query_builder_schemas(self, file_id: str, extracted_data: Dict, semantic_model: Optional[SemanticModel]):
        """Update query builder with new schema information"""
        try:
            if semantic_model and extracted_data.get("type") == "tabular":
                schema_info = {
                    "model_id": semantic_model.id,
                    "model_name": semantic_model.name,
                    "tables": semantic_model.schema_definition.get("tables", {}),
                    "metrics": semantic_model.schema_definition.get("metrics", []),
                    "dimensions": semantic_model.schema_definition.get("dimensions", []),
                    "file_id": file_id,
                    "updated_at": datetime.now().isoformat()
                }
                
                # Notify query builder service
                await self.notification_service.notify_feature("query_builder", {
                    "action": "schema_added",
                    "schema": schema_info
                })
                
                print(f"Updated query builder schemas for file: {file_id}")
                
        except Exception as e:
            print(f"Error updating query builder schemas: {str(e)}")
    
    async def _notify_conversational_ai(self, file_id: str, extracted_data: Dict, semantic_model: Optional[SemanticModel]):
        """Notify conversational AI of new data source"""
        try:
            ai_context = {
                "data_source_id": file_id,
                "data_type": extracted_data.get("type", "unknown"),
                "columns": extracted_data.get("columns", []),
                "sample_data": extracted_data.get("rows", [])[:5],  # First 5 rows
                "semantic_model": {
                    "id": semantic_model.id,
                    "name": semantic_model.name,
                    "metrics": semantic_model.schema_definition.get("metrics", []),
                    "dimensions": semantic_model.schema_definition.get("dimensions", [])
                } if semantic_model else None,
                "suggestions": self._generate_ai_suggestions(extracted_data)
            }
            
            await self.notification_service.notify_feature("conversational_ai", {
                "action": "data_source_added",
                "context": ai_context
            })
            
            print(f"Notified conversational AI of new data source: {file_id}")
            
        except Exception as e:
            print(f"Error notifying conversational AI: {str(e)}")
    
    async def _update_dashboard_sources(self, file_id: str, extracted_data: Dict, semantic_model: Optional[SemanticModel]):
        """Update dashboard builder with new data sources"""
        try:
            dashboard_source = {
                "source_id": file_id,
                "source_name": extracted_data.get("file_info", {}).get("name", f"File {file_id}"),
                "source_type": "uploaded_file",
                "data_type": extracted_data.get("type", "unknown"),
                "columns": extracted_data.get("columns", []),
                "semantic_model": {
                    "id": semantic_model.id,
                    "name": semantic_model.name,
                    "metrics": semantic_model.schema_definition.get("metrics", []),
                    "dimensions": semantic_model.schema_definition.get("dimensions", [])
                } if semantic_model else None,
                "chart_suggestions": self._generate_chart_suggestions(extracted_data)
            }
            
            await self.notification_service.notify_feature("dashboard_builder", {
                "action": "data_source_added",
                "source": dashboard_source
            })
            
            print(f"Updated dashboard builder data sources: {file_id}")
            
        except Exception as e:
            print(f"Error updating dashboard sources: {str(e)}")
    
    async def _generate_initial_insights(self, file_id: str, extracted_data: Dict, user_id: str):
        """Generate initial AI insights for the uploaded data"""
        try:
            from services.ai_insights import AIInsightsService
            
            ai_insights = AIInsightsService()
            
            # Generate insights in background
            await ai_insights.generate_insights(
                extracted_data, 
                file_id, 
                "file",
                auto_generated=True
            )
            
            print(f"Generated initial insights for file: {file_id}")
            
        except Exception as e:
            print(f"Error generating initial insights: {str(e)}")
    
    def _generate_ai_suggestions(self, extracted_data: Dict) -> List[str]:
        """Generate AI conversation suggestions based on data"""
        suggestions = []
        
        if extracted_data.get("type") == "tabular":
            columns = extracted_data.get("columns", [])
            
            # Basic analysis suggestions
            suggestions.extend([
                "Show me a summary of this data",
                "What are the key insights from this dataset?",
                "Create a visualization of this data"
            ])
            
            # Column-specific suggestions
            numeric_cols = [col["name"] for col in columns if col["type"] in ["number", "integer"]]
            categorical_cols = [col["name"] for col in columns if col["type"] == "string"]
            
            if numeric_cols:
                suggestions.extend([
                    f"Show me the distribution of {numeric_cols[0]}",
                    f"What's the average {numeric_cols[0]}?",
                    f"Find outliers in {numeric_cols[0]}"
                ])
            
            if categorical_cols and numeric_cols:
                suggestions.append(f"Compare {numeric_cols[0]} by {categorical_cols[0]}")
        
        return suggestions[:8]  # Limit to 8 suggestions
    
    def _generate_chart_suggestions(self, extracted_data: Dict) -> List[Dict]:
        """Generate chart suggestions for dashboard builder"""
        suggestions = []
        
        if extracted_data.get("type") == "tabular":
            columns = extracted_data.get("columns", [])
            numeric_cols = [col for col in columns if col["type"] in ["number", "integer"]]
            categorical_cols = [col for col in columns if col["type"] == "string"]
            datetime_cols = [col for col in columns if col["type"] == "datetime"]
            
            # Bar chart suggestions
            if categorical_cols and numeric_cols:
                suggestions.append({
                    "type": "bar",
                    "title": f"{numeric_cols[0]['name']} by {categorical_cols[0]['name']}",
                    "x_axis": categorical_cols[0]["name"],
                    "y_axis": numeric_cols[0]["name"],
                    "description": f"Compare {numeric_cols[0]['name']} across different {categorical_cols[0]['name']}"
                })
            
            # Line chart for time series
            if datetime_cols and numeric_cols:
                suggestions.append({
                    "type": "line",
                    "title": f"{numeric_cols[0]['name']} over time",
                    "x_axis": datetime_cols[0]["name"],
                    "y_axis": numeric_cols[0]["name"],
                    "description": f"Show trend of {numeric_cols[0]['name']} over time"
                })
            
            # Pie chart for categorical distribution
            if categorical_cols:
                suggestions.append({
                    "type": "pie",
                    "title": f"Distribution of {categorical_cols[0]['name']}",
                    "dimension": categorical_cols[0]["name"],
                    "description": f"Show the distribution breakdown of {categorical_cols[0]['name']}"
                })
            
            # Histogram for numeric distribution
            if numeric_cols:
                suggestions.append({
                    "type": "histogram",
                    "title": f"Distribution of {numeric_cols[0]['name']}",
                    "x_axis": numeric_cols[0]["name"],
                    "description": f"Show the distribution pattern of {numeric_cols[0]['name']}"
                })
        
        return suggestions
    
    async def _update_file_status(self, file_id: str, status: str, extracted_data: Dict = None, metadata: Dict = None, error: str = None):
        """Update file status in database"""
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if file_record:
                file_record.processing_status = status
                if extracted_data:
                    file_record.extracted_data = extracted_data
                if metadata:
                    file_record.file_metadata = metadata
                if error:
                    file_record.file_metadata = {"error": error}
                
                db.commit()
                print(f"Updated file {file_id} status to: {status}")
        except Exception as e:
            print(f"Error updating file status: {str(e)}")
            db.rollback()
        finally:
            db.close()

# Initialize enhanced service
enhanced_service = EnhancedFileService()

async def process_file_with_integration(file_id: str, file_path: str, file_type: str, user_id: str):
    """Background task to process file with full integration"""
    try:
        print(f"Starting integrated processing for file {file_id}")
        success = await enhanced_service.process_and_integrate_file(file_id, file_path, file_type, user_id)
        
        if success:
            print(f"Integrated processing completed successfully for file {file_id}")
        else:
            print(f"Integrated processing failed for file {file_id}")
            
    except Exception as e:
        print(f"Integrated processing error for file {file_id}: {str(e)}")

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload and process a file with full integration"""
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create database record
    db_file = UploadedFile(
        id=file_id,
        filename=filename,
        original_filename=file.filename,
        file_type=file_ext[1:],  # Remove the dot
        file_size=len(content),
        file_path=file_path,
        processing_status="pending",
        user_id=current_user.id
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # Start integrated processing in background
    background_tasks.add_task(
        process_file_with_integration,
        file_id,
        file_path,
        file_ext[1:],
        current_user.id
    )
    
    return FileUploadResponse(
        file_id=file_id,
        filename=file.filename,
        status="uploaded",
        message="File uploaded successfully. Integrated processing started."
    )

@router.get("/", response_model=List[FileListResponse])
async def list_files(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List user's uploaded files with enhanced information"""
    
    files = db.query(UploadedFile).filter(
        UploadedFile.user_id == current_user.id
    ).order_by(UploadedFile.created_at.desc()).all()
    
    return [
        FileListResponse(
            id=file.id,
            filename=file.original_filename,
            file_type=file.file_type,
            file_size=file.file_size,
            processing_status=file.processing_status,
            created_at=file.created_at,
            has_semantic_model=file.semantic_model_id is not None
        )
        for file in files
    ]

@router.get("/{file_id}/status", response_model=FileProcessingStatus)
async def get_file_status(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get enhanced file processing status"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get additional integration status
    integration_status = await data_registry.get_source_status(file_id)
    
    return FileProcessingStatus(
        file_id=file.id,
        status=file.processing_status,
        extracted_data=file.extracted_data,
        semantic_model_id=file.semantic_model_id,
        integration_status=integration_status
    )

@router.get("/{file_id}/data-source-info")
async def get_data_source_info(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive data source information for cross-feature access"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get data source registry information
    source_info = await data_registry.get_source_info(file_id)
    
    # Get semantic model if available
    semantic_model_info = None
    if file.semantic_model_id:
        semantic_model = db.query(SemanticModel).filter(
            SemanticModel.id == file.semantic_model_id
        ).first()
        
        if semantic_model:
            semantic_model_info = {
                "id": semantic_model.id,
                "name": semantic_model.name,
                "description": semantic_model.description,
                "schema_definition": semantic_model.schema_definition
            }
    
    return {
        "file_info": {
            "id": file.id,
            "filename": file.original_filename,
            "file_type": file.file_type,
            "processing_status": file.processing_status,
            "extracted_data": file.extracted_data
        },
        "data_source_info": source_info,
        "semantic_model": semantic_model_info,
        "integration_features": [
            "conversational_ai",
            "query_builder", 
            "dashboard_builder",
            "ai_assistant"
        ]
    }

@router.post("/{file_id}/sync-features")
async def sync_with_features(
    file_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually sync file with all platform features"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file.processing_status != "completed":
        raise HTTPException(status_code=400, detail="File processing not completed")
    
    # Re-run integration process
    background_tasks.add_task(
        enhanced_service.process_and_integrate_file,
        file_id,
        file.file_path,
        file.file_type,
        current_user.id
    )
    
    return {"message": "Feature synchronization started"}

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete file and clean up all integrations"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Clean up integrations
    try:
        # Remove from data source registry
        await data_registry.unregister_source(file_id)
        
        # Notify all features of removal
        await notification_service.notify_all_features({
            "action": "data_source_removed",
            "file_id": file_id
        })
        
        # Delete semantic model if exists
        if file.semantic_model_id:
            semantic_model = db.query(SemanticModel).filter(
                SemanticModel.id == file.semantic_model_id
            ).first()
            if semantic_model:
                db.delete(semantic_model)
        
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")
    
    # Delete physical file
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception as e:
        print(f"Error deleting file {file.file_path}: {e}")
    
    # Delete database record
    db.delete(file)
    db.commit()
    
    return {"message": "File and all integrations deleted successfully"}