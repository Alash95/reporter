from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from database import engine, get_db
from models import Base
from routers import auth, models, queries, analytics, ai
from services.cache import CacheService
from services.ai_query import AIQueryService

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize services
cache_service = CacheService()
ai_service = AIQueryService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await cache_service.connect()
    yield
    # Shutdown
    await cache_service.disconnect()

app = FastAPI(
    title="Analytics API Platform",
    description="Open-source analytics platform with AI-powered query generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(models.router, prefix="/api/models", tags=["semantic models"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )