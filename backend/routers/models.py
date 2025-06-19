from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import SemanticModel

from schemas import SemanticModel as SemanticModelSchema, SemanticModelCreate

router = APIRouter()

# Default semantic models
DEFAULT_MODELS = {
    "ecommerce": {
        "name": "E-commerce Analytics",
        "description": "Sales, orders, and customer metrics",
        "schema_definition": {
            "tables": {
                "orders": {
                    "sql": "SELECT * FROM orders",
                    "columns": {
                        "id": {"type": "string", "primary": True},
                        "customer_id": {"type": "string"},
                        "total": {"type": "number"},
                        "status": {"type": "string"},
                        "created_at": {"type": "datetime"},
                        "region": {"type": "string"}
                    }
                },
                "customers": {
                    "sql": "SELECT * FROM customers",
                    "columns": {
                        "id": {"type": "string", "primary": True},
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                        "segment": {"type": "string"},
                        "created_at": {"type": "datetime"}
                    }
                }
            },
            "metrics": [
                {
                    "name": "total_revenue",
                    "title": "Total Revenue",
                    "type": "sum",
                    "sql": "SUM(orders.total)",
                    "format": "currency"
                },
                {
                    "name": "order_count",
                    "title": "Order Count",
                    "type": "count",
                    "sql": "COUNT(orders.id)",
                    "format": "number"
                },
                {
                    "name": "avg_order_value",
                    "title": "Average Order Value",
                    "type": "avg",
                    "sql": "AVG(orders.total)",
                    "format": "currency"
                }
            ],
            "dimensions": [
                {
                    "name": "order_status",
                    "title": "Order Status",
                    "sql": "orders.status",
                    "type": "string"
                },
                {
                    "name": "customer_segment",
                    "title": "Customer Segment",
                    "sql": "customers.segment",
                    "type": "string"
                },
                {
                    "name": "region",
                    "title": "Region",
                    "sql": "orders.region",
                    "type": "string"
                },
                {
                    "name": "order_date",
                    "title": "Order Date",
                    "sql": "orders.created_at",
                    "type": "datetime"
                }
            ],
            "joins": [
                {
                    "name": "order_customer",
                    "sql": "orders.customer_id = customers.id"
                }
            ]
        }
    }
}

@router.get("/", response_model=List[SemanticModelSchema])
async def get_models(db: Session = Depends(get_db)):
    # Get all models
    models = db.query(SemanticModel).all()
    
    # If no models exist, create default ones
    if not models:
        for model_id, model_data in DEFAULT_MODELS.items():
            db_model = SemanticModel(
                id=model_id,
                name=model_data["name"],
                description=model_data["description"],
                schema_definition=model_data["schema_definition"]
            )
            db.add(db_model)
        
        db.commit()
        models = db.query(SemanticModel).all()
    
    return [SemanticModelSchema.from_orm(model) for model in models]

@router.post("/", response_model=SemanticModelSchema)
async def create_model(model_data: SemanticModelCreate, db: Session = Depends(get_db)):
    db_model = SemanticModel(
        name=model_data.name,
        description=model_data.description,
        schema_definition=model_data.schema_definition
    )
    
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    
    return SemanticModelSchema.from_orm(db_model)

@router.get("/{model_id}", response_model=SemanticModelSchema)
async def get_model(model_id: str, db: Session = Depends(get_db)):
    model = db.query(SemanticModel).filter(SemanticModel.id == model_id).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return SemanticModelSchema.from_orm(model)

@router.get("/{model_id}/metrics")
async def get_model_metrics(model_id: str, db: Session = Depends(get_db)):
    model = db.query(SemanticModel).filter(SemanticModel.id == model_id).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return model.schema_definition.get("metrics", [])

@router.get("/{model_id}/dimensions")
async def get_model_dimensions(model_id: str, db: Session = Depends(get_db)):
    model = db.query(SemanticModel).filter(SemanticModel.id == model_id).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return model.schema_definition.get("dimensions", [])