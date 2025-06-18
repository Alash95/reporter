from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from database import engine
from models import Base
from routers import auth, models, queries, analytics, ai, files, dashboards, insights

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("static/charts", exist_ok=True)
    yield
    # Shutdown
    pass

app = FastAPI(
    title="AI Analytics Platform",
    description="AI-powered analytics platform with dataset analysis and dashboard generation",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "https://localhost:5173",
        "http://localhost:3000", 
        "https://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(models.router, prefix="/api/models", tags=["semantic models"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(files.router, prefix="/api/files", tags=["file management"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "features": [
            "authentication",
            "file_upload",
            "ai_insights", 
            "semantic_modeling",
            "dashboard_builder",
            "conversational_ai"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )