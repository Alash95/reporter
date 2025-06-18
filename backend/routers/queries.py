from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import time
import hashlib
import pandas as pd
import json

from database import get_db
from models import Query, SemanticModel, UploadedFile
from schemas import QueryCreate, QueryExecute, QueryResult, Query as QuerySchema
from auth import get_current_active_user, User
from services.query_engine import QueryEngine

router = APIRouter()
query_engine = QueryEngine()

@router.post("/execute", response_model=QueryResult)
async def execute_query(
    query_data: QueryExecute,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Execute SQL query"""
    
    start_time = time.time()
    
    try:
        # Execute query
        result = await query_engine.execute_query(
            sql=query_data.sql,
            model_id=query_data.model_id,
            user_id=current_user.id,
            db=db
        )
        
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Create query record
        db_query = Query(
            sql_query=query_data.sql,
            model_id=query_data.model_id,
            execution_time=execution_time,
            row_count=len(result["data"]),
            status="completed",
            result_data=result,
            user_id=current_user.id
        )
        db.add(db_query)
        db.commit()
        db.refresh(db_query)
        
        return QueryResult(
            data=result["data"],
            columns=result["columns"],
            row_count=len(result["data"]),
            execution_time=execution_time,
            query_id=db_query.id,
            from_cache=False
        )
        
    except Exception as e:
        # Record failed query
        execution_time = (time.time() - start_time) * 1000
        
        db_query = Query(
            sql_query=query_data.sql,
            model_id=query_data.model_id,
            execution_time=execution_time,
            status="failed",
            error_message=str(e),
            user_id=current_user.id
        )
        db.add(db_query)
        db.commit()
        
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

@router.get("/", response_model=List[QuerySchema])
async def get_queries(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's query history"""
    
    queries = db.query(Query).filter(
        Query.user_id == current_user.id
    ).order_by(Query.created_at.desc()).limit(50).all()
    
    return [QuerySchema.from_orm(query) for query in queries]

@router.post("/", response_model=QuerySchema)
async def create_query(
    query_data: QueryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save a query"""
    
    db_query = Query(
        name=query_data.name,
        sql_query=query_data.sql_query,
        model_id=query_data.model_id,
        user_id=current_user.id
    )
    
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    
    return QuerySchema.from_orm(db_query)