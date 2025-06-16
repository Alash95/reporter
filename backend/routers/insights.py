from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Insight, UploadedFile, Query
from schemas import InsightResponse, InsightGenerate
from auth import get_current_active_user
from services.ai_insights import AIInsightsService

router = APIRouter()
ai_insights = AIInsightsService()

@router.post("/generate")
async def generate_insights(
    background_tasks: BackgroundTasks,
    request: InsightGenerate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Validate data source
    if request.data_source_type == "file":
        file = db.query(UploadedFile).filter(
            UploadedFile.id == request.data_source_id,
            UploadedFile.tenant_id == current_user.tenant_id
        ).first()
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        data_source = file.extracted_data
    elif request.data_source_type == "query":
        query = db.query(Query).filter(
            Query.id == request.data_source_id,
            Query.user_id == current_user.id
        ).first()
        if not query:
            raise HTTPException(status_code=404, detail="Query not found")
        data_source = query.result_data
    else:
        raise HTTPException(status_code=400, detail="Invalid data source type")
    
    # Generate insights in background
    background_tasks.add_task(
        ai_insights.generate_insights,
        data_source,
        request.data_source_id,
        request.data_source_type,
        current_user.id,
        current_user.tenant_id
    )
    
    return {"message": "Insight generation started"}

@router.get("/", response_model=List[InsightResponse])
async def list_insights(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    insights = db.query(Insight).filter(
        Insight.tenant_id == current_user.tenant_id
    ).order_by(Insight.created_at.desc()).limit(50).all()
    
    return [InsightResponse.from_orm(insight) for insight in insights]

@router.get("/{insight_id}", response_model=InsightResponse)
async def get_insight(
    insight_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.tenant_id == current_user.tenant_id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    return InsightResponse.from_orm(insight)

@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.tenant_id == current_user.tenant_id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    db.delete(insight)
    db.commit()
    
    return {"message": "Insight deleted successfully"}

@router.post("/auto-generate")
async def auto_generate_insights(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get recent files and queries for auto-insight generation
    recent_files = db.query(UploadedFile).filter(
        UploadedFile.tenant_id == current_user.tenant_id,
        UploadedFile.processing_status == "completed"
    ).order_by(UploadedFile.created_at.desc()).limit(5).all()
    
    recent_queries = db.query(Query).filter(
        Query.user_id == current_user.id,
        Query.status == "completed"
    ).order_by(Query.created_at.desc()).limit(5).all()
    
    # Generate insights for each data source
    for file in recent_files:
        if file.extracted_data:
            background_tasks.add_task(
                ai_insights.generate_insights,
                file.extracted_data,
                file.id,
                "file",
                current_user.id,
                current_user.tenant_id
            )
    
    for query in recent_queries:
        if query.result_data:
            background_tasks.add_task(
                ai_insights.generate_insights,
                query.result_data,
                query.id,
                "query",
                current_user.id,
                current_user.tenant_id
            )
    
    return {"message": f"Auto-insight generation started for {len(recent_files)} files and {len(recent_queries)} queries"}