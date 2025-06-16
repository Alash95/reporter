from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, SemanticModel
from schemas import AIQueryRequest, AIQueryResponse
from auth import get_current_active_user
from services.ai_query import AIQueryService

router = APIRouter()
ai_service = AIQueryService()

@router.post("/query", response_model=AIQueryResponse)
async def generate_query(
    request: AIQueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get the semantic model if specified
    model = None
    if request.model_id:
        model = db.query(SemanticModel).filter(
            SemanticModel.id == request.model_id,
            SemanticModel.tenant_id == current_user.tenant_id
        ).first()
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        result = await ai_service.generate_query(request.prompt, model)
        return AIQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI query generation failed: {str(e)}")

@router.post("/explain")
async def explain_query(
    sql: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        explanation = await ai_service.explain_query(sql)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query explanation failed: {str(e)}")