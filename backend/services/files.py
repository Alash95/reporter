from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import aiofiles
from datetime import datetime
import asyncio

from database import get_db
from models import UploadedFile, SemanticModel
from schemas import FileUploadResponse, FileListResponse, FileProcessingStatus
from services.file_processor import FileProcessorService
from auth import get_current_active_user, User

router = APIRouter()
file_processor = FileProcessorService()

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".pdf", ".docx", ".txt", ".json"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

async def process_file_background(file_id: str, file_path: str, file_type: str):
    """Background task to process file"""
    try:
        print(f"Starting background processing for file {file_id}")
        await file_processor.process_file(file_id, file_path, file_type)
        print(f"Completed background processing for file {file_id}")
    except Exception as e:
        print(f"Background processing error for file {file_id}: {str(e)}")
        # Update file status to failed
        from database import SessionLocal
        db = SessionLocal()
        try:
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if file_record:
                file_record.processing_status = "failed"
                file_record.metadata = {"error": str(e)}
                db.commit()
                print(f"Updated file {file_id} status to failed")
        except Exception as db_error:
            print(f"Database update error: {str(db_error)}")
        finally:
            db.close()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload and process a file"""
    
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
    
    # Start processing immediately in background
    background_tasks.add_task(process_file_background, file_id, file_path, file_ext[1:])
    
    return FileUploadResponse(
        file_id=file_id,
        filename=file.filename,
        status="uploaded",
        message="File uploaded successfully. Processing started."
    )

@router.get("/", response_model=List[FileListResponse])
async def list_files(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List user's uploaded files"""
    
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
    """Get file processing status"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileProcessingStatus(
        file_id=file.id,
        status=file.processing_status,
        extracted_data=file.extracted_data,
        semantic_model_id=file.semantic_model_id
    )

@router.get("/{file_id}/preview")
async def preview_file_data(
    file_id: str,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Preview file data"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file.processing_status != "completed":
        raise HTTPException(status_code=400, detail="File processing not completed")
    
    if not file.extracted_data:
        raise HTTPException(status_code=400, detail="No data available")
    
    # Return limited preview of the data
    data = file.extracted_data.copy()
    
    if data.get('type') == 'tabular' and 'rows' in data:
        if len(data['rows']) > limit:
            data['rows'] = data['rows'][:limit]
            data['preview_note'] = f"Showing first {limit} rows of {len(file.extracted_data['rows'])} total rows"
    
    return data

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a file"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception as e:
        print(f"Error deleting file {file.file_path}: {e}")
    
    # Delete database record
    db.delete(file)
    db.commit()
    
    return {"message": "File deleted successfully"}

@router.post("/{file_id}/reprocess")
async def reprocess_file(
    file_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger file reprocessing"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Reset status to pending
    file.processing_status = "pending"
    file.extracted_data = None
    file.metadata = {}
    db.commit()
    
    # Start processing again
    background_tasks.add_task(process_file_background, file_id, file.file_path, file.file_type)
    
    return {"message": "File reprocessing started"}

@router.post("/reset-stuck-files")
async def reset_stuck_files(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Reset files that have been stuck in processing for too long"""
    
    import time
    current_time = time.time()
    stuck_threshold = 300  # 5 minutes
    
    # Find files stuck in processing for more than 5 minutes
    stuck_files = db.query(UploadedFile).filter(
        UploadedFile.user_id == current_user.id,
        UploadedFile.processing_status == "processing"
    ).all()
    
    reset_count = 0
    for file in stuck_files:
        # Check if file has been processing for too long
        if file.metadata and file.metadata.get('started_at'):
            started_at = file.metadata.get('started_at')
            if current_time - started_at > stuck_threshold:
                file.processing_status = "pending"
                file.metadata = {}
                background_tasks.add_task(process_file_background, file.id, file.file_path, file.file_type)
                reset_count += 1
        else:
            # No start time recorded, reset it
            file.processing_status = "pending"
            file.metadata = {}
            background_tasks.add_task(process_file_background, file.id, file.file_path, file.file_type)
            reset_count += 1
    
    db.commit()
    
    return {"message": f"Reset {reset_count} stuck files and restarted processing"}

@router.post("/{file_id}/create-model")
async def create_semantic_model_from_file(
    file_id: str,
    model_name: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create semantic model from file data"""
    
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file.processing_status != "completed":
        raise HTTPException(status_code=400, detail="File processing not completed")
    
    # Generate semantic model from file data
    semantic_model = await file_processor.create_semantic_model(
        file.extracted_data,
        model_name
    )
    
    # Update file record
    file.semantic_model_id = semantic_model.id
    db.commit()
    
    return {
        "message": "Semantic model created successfully",
        "model_id": semantic_model.id,
        "model_name": semantic_model.name
    }