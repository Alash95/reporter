from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import SemanticModel
from schemas import AIQueryRequest, AIQueryResponse
from services.ai_query import AIQueryService

router = APIRouter()
ai_service = AIQueryService()

@router.post("/query", response_model=AIQueryResponse)
async def generate_query(request: AIQueryRequest, db: Session = Depends(get_db)):
    # Get the semantic model if specified
    model = None
    if request.model_id:
        model = db.query(SemanticModel).filter(SemanticModel.id == request.model_id).first()
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        result = await ai_service.generate_query(request.prompt, model)
        return AIQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI query generation failed: {str(e)}")

@router.post("/explain")
async def explain_query(sql: str):
    try:
        explanation = await ai_service.explain_query(sql)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query explanation failed: {str(e)}")

@router.post("/conversation")
async def ai_conversation(request: dict, db: Session = Depends(get_db)):
    """Handle conversational AI requests"""
    try:
        message = request.get("message", "")
        context = request.get("context", {})
        
        # Mock AI conversation response
        response = {
            "response": f"I understand you're asking about: '{message}'. Let me help you analyze your data.",
            "generated_query": "SELECT * FROM uploaded_data LIMIT 10",
            "suggested_chart": {
                "data": [{"x": "Sample", "y": 100}],
                "layout": {"title": "Sample Chart"}
            },
            "insights": [
                "This appears to be sample data",
                "Consider exploring trends over time",
                "Look for patterns in your key metrics"
            ]
        }
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI conversation failed: {str(e)}")