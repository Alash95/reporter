from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
import os
import asyncio
from typing import List
from dotenv import load_dotenv

from database import engine, get_db
from models import Base
from routers import models, queries, analytics, ai, files, dashboards, insights
from services.cache import CacheService
from services.ai_query import AIQueryService
from services.file_processor import FileProcessorService
from services.websocket_manager import WebSocketManager

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize services
cache_service = CacheService()
ai_service = AIQueryService()
file_processor = FileProcessorService()
websocket_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await cache_service.connect()
    # Create upload directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("static/charts", exist_ok=True)
    yield
    # Shutdown
    await cache_service.disconnect()

app = FastAPI(
    title="Advanced Analytics Platform",
    description="AI-powered analytics platform with file upload, semantic modeling, and conversational insights",
    version="2.0.0",
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

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers (removed auth dependency)
app.include_router(models.router, prefix="/api/models", tags=["semantic models"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(files.router, prefix="/api/files", tags=["file management"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket_manager.send_personal_message(f"Echo: {data}", client_id)
    except WebSocketDisconnect:
        websocket_manager.disconnect(client_id)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "features": [
            "file_upload",
            "ai_insights", 
            "semantic_modeling",
            "dashboard_builder",
            "real_time_updates",
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