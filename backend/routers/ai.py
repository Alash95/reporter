from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import openai
import pandas as pd
import json
from typing import Dict, Any, List

from database import get_db
from models import SemanticModel, UploadedFile, Dashboard, Widget
from schemas import (
    AIQueryRequest, AIQueryResponse, 
    ProblemStatementRequest, DashboardGenerationResponse
)
from auth import get_current_active_user, User
from services.ai_service import AIService
from services.dashboard_generator import DashboardGenerator

router = APIRouter()
ai_service = AIService()
dashboard_generator = DashboardGenerator()

@router.post("/query", response_model=AIQueryResponse)
async def generate_query(
    request: AIQueryRequest, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate SQL query from natural language prompt"""
    try:
        # Get the semantic model if specified
        model = None
        if request.model_id:
            model = db.query(SemanticModel).filter(
                SemanticModel.id == request.model_id
            ).first()
            
            if not model:
                raise HTTPException(status_code=404, detail="Model not found")
        
        result = await ai_service.generate_sql_query(request.prompt, model)
        return AIQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI query generation failed: {str(e)}")

@router.post("/explain")
async def explain_query(
    sql: str,
    current_user: User = Depends(get_current_active_user)
):
    """Explain what a SQL query does in natural language"""
    try:
        explanation = await ai_service.explain_query(sql)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query explanation failed: {str(e)}")

@router.post("/generate-dashboard", response_model=DashboardGenerationResponse)
async def generate_dashboard(
    background_tasks: BackgroundTasks,
    request: ProblemStatementRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a complete dashboard from a problem statement and dataset"""
    try:
        # Get the uploaded file
        file = db.query(UploadedFile).filter(
            UploadedFile.id == request.file_id,
            UploadedFile.user_id == current_user.id
        ).first()
        
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        if file.processing_status != "completed":
            raise HTTPException(status_code=400, detail="File processing not completed")
        
        # Generate dashboard
        result = await dashboard_generator.generate_dashboard(
            problem_statement=request.problem_statement,
            data=file.extracted_data,
            preferences=request.preferences,
            user_id=current_user.id,
            db=db
        )
        
        return DashboardGenerationResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")

@router.post("/conversation")
async def ai_conversation(
    request: dict, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Handle conversational AI requests"""
    try:
        message = request.get("message", "")
        context = request.get("context", {})
        
        # Get user's available data
        user_files = db.query(UploadedFile).filter(
            UploadedFile.user_id == current_user.id,
            UploadedFile.processing_status == "completed"
        ).all()
        
        # Process with AI
        response = await ai_service.process_conversation(
            message=message,
            context=context,
            available_data=user_files,
            user_id=current_user.id
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI conversation failed: {str(e)}")

@router.post("/analyze-data")
async def analyze_data(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Perform automatic data analysis on uploaded file"""
    try:
        file = db.query(UploadedFile).filter(
            UploadedFile.id == file_id,
            UploadedFile.user_id == current_user.id
        ).first()
        
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        analysis = await ai_service.analyze_dataset(file.extracted_data)
        
        return {
            "summary": analysis["summary"],
            "insights": analysis["insights"],
            "recommended_visualizations": analysis["recommended_visualizations"],
            "data_quality": analysis["data_quality"],
            "suggested_questions": analysis["suggested_questions"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data analysis failed: {str(e)}")