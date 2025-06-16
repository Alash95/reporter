from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import time
import hashlib

from database import get_db
from models import Query, SemanticModel
from schemas import QueryCreate, QueryExecute, QueryResult, Query as QuerySchema
from services.query_engine import QueryEngine
from services.cache import CacheService

router = APIRouter()
query_engine = QueryEngine()
cache_service = CacheService()

@router.post("/execute", response_model=QueryResult)
async def execute_query(query_data: QueryExecute, db: Session = Depends(get_db)):
    start_time = time.time()
    
    # Check cache first
    query_hash = hashlib.md5(query_data.sql.encode()).hexdigest()
    if query_data.use_cache:
        cached_result = await cache_service.get(query_hash)
        if cached_result:
            return QueryResult(
                data=cached_result["data"],
                columns=cached_result["columns"],
                row_count=cached_result["row_count"],
                execution_time=cached_result["execution_time"],
                query_id=cached_result["query_id"],
                from_cache=True
            )
    
    try:
        # Execute query
        result = await query_engine.execute(query_data.sql, query_data.model_id)
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Create query record
        db_query = Query(
            sql_query=query_data.sql,
            model_id=query_data.model_id,
            execution_time=execution_time,
            row_count=len(result["data"]),
            status="completed"
        )
        db.add(db_query)
        db.commit()
        db.refresh(db_query)
        
        query_result = QueryResult(
            data=result["data"],
            columns=result["columns"],
            row_count=len(result["data"]),
            execution_time=execution_time,
            query_id=db_query.id,
            from_cache=False
        )
        
        # Cache the result
        if query_data.use_cache:
            await cache_service.set(query_hash, {
                "data": result["data"],
                "columns": result["columns"],
                "row_count": len(result["data"]),
                "execution_time": execution_time,
                "query_id": db_query.id
            })
        
        return query_result
        
    except Exception as e:
        # Record failed query
        db_query = Query(
            sql_query=query_data.sql,
            model_id=query_data.model_id,
            execution_time=(time.time() - start_time) * 1000,
            status="failed",
            error_message=str(e)
        )
        db.add(db_query)
        db.commit()
        
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

@router.get("/", response_model=List[QuerySchema])
async def get_queries(db: Session = Depends(get_db)):
    queries = db.query(Query).order_by(Query.created_at.desc()).limit(50).all()
    return [QuerySchema.from_orm(query) for query in queries]

@router.post("/", response_model=QuerySchema)
async def create_query(query_data: QueryCreate, db: Session = Depends(get_db)):
    db_query = Query(
        name=query_data.name,
        sql_query=query_data.sql_query,
        model_id=query_data.model_id
    )
    
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    
    return QuerySchema.from_orm(db_query)