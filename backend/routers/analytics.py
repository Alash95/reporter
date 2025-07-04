from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from models import Query

router = APIRouter()

@router.get("/queries")
async def get_query_analytics(db: Session = Depends(get_db)):
    # Get recent queries
    recent_queries = db.query(Query).order_by(Query.created_at.desc()).limit(50).all()
    
    # Calculate average execution time
    avg_execution_time = db.query(func.avg(Query.execution_time)).filter(
        Query.status == "completed"
    ).scalar() or 0
    
    # Get total query count
    total_queries = db.query(func.count(Query.id)).scalar() or 0
    
    return {
        "totalQueries": total_queries,
        "avgExecutionTime": round(avg_execution_time, 2),
        "recentQueries": [
            {
                "sql": query.sql_query[:100] + "..." if len(query.sql_query) > 100 else query.sql_query,
                "executionTime": query.execution_time,
                "rowCount": query.row_count,
                "timestamp": query.created_at.isoformat(),
                "status": query.status
            }
            for query in recent_queries[:10]
        ]
    }

@router.get("/performance")
async def get_performance_metrics():
    # Mock performance data - in production, this would come from monitoring systems
    return {
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "active_connections": 24,
        "cache_hit_rate": 0.75,
        "queries_per_minute": 12.5
    }