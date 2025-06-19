# backend/main.py - Updated main FastAPI application with enhanced integration

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
import time


# Import all routers
from routers import auth, files, models, queries, dashboards, ai, insights
from routers.integrations import router as integration_router

# Import services for initialization
from services.notification_service import initialize_notification_service
from services.data_source_registry import initialize_registry
from services.ai_service import initialize_ai_service
from database import engine, get_db
from models import Base
from sqlalchemy.orm import Session


# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    print("🚀 Starting AI Analytics Platform...")
    
    # Initialize core services
    await initialize_notification_service()
    await initialize_registry()
    
    # Initialize AI service with API key from environment
    ai_api_key = os.getenv("OPENAI_API_KEY")
    if ai_api_key:
        await initialize_ai_service(ai_api_key)
        print("✅ AI Service initialized")
    else:
        print("⚠️ AI Service not initialized - OPENAI_API_KEY not found")
    
    print("✅ All services initialized successfully")
    
    yield
    
    print("🛑 Shutting down AI Analytics Platform...")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="AI Analytics Platform",
    description="Enhanced analytics platform with AI-powered insights and cross-feature integration",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "features": {
            "file_upload": "enabled",
            "conversational_ai": "enabled", 
            "query_builder": "enabled",
            "dashboard_builder": "enabled",
            "ai_assistant": "enabled",
            "cross_feature_integration": "enabled"
        }
    }

# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(files.router, prefix="/api/files", tags=["File Management"])
app.include_router(models.router, prefix="/api/models", tags=["Semantic Models"])
app.include_router(queries.router, prefix="/api/queries", tags=["Query Engine"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["Dashboards"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Services"])
app.include_router(insights.router, prefix="/api/insights", tags=["AI Insights"])

# Enhanced Integration Routes
app.include_router(integration_router, prefix="/api/integration", tags=["Cross-Feature Integration"])

# Additional Enhanced API Routes
@app.post("/api/ai/conversation-enhanced")
async def enhanced_conversational_ai(
    request: dict,
    db: Session = Depends(get_db)
):
    """Enhanced conversational AI endpoint with full data source integration"""
    from services.ai_service import ai_service
    
    try:
        message = request.get("message", "")
        context = request.get("context", {})
        
        # Extract user ID from context or session
        user_id = "default_user"  # Replace with actual user ID extraction
        
        result = await ai_service.conversational_analysis(
            message=message,
            user_id=user_id,
            conversation_history=context.get("conversation_history", []),
            available_data_sources=context.get("available_data_sources", [])
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/query-suggestions")
async def generate_query_suggestions(
    request: dict,
    db: Session = Depends(get_db)
):
    """Generate AI-powered query suggestions based on schema"""
    try:
        schema_info = request.get("schema_info", {})
        
        # Generate suggestions based on schema
        suggestions = []
        
        # Extract table and column information
        tables = schema_info.get("tables", [])
        metrics = schema_info.get("metrics", [])
        dimensions = schema_info.get("dimensions", [])
        
        if tables:
            table = tables[0]
            table_name = table.get("name", "main_table")
            columns = table.get("columns", [])
            
            # Basic suggestions
            suggestions.extend([
                f"Show me the first 10 rows from {table_name}",
                f"What is the total count of records in {table_name}?",
                "Give me a summary of all the data"
            ])
            
            # Column-specific suggestions
            numeric_cols = [col for col in columns if col.get("type") in ["number", "integer"]]
            categorical_cols = [col for col in columns if col.get("type") == "string"]
            
            if numeric_cols:
                col = numeric_cols[0]
                suggestions.extend([
                    f"What is the average {col['name']}?",
                    f"Show me the maximum {col['name']}",
                    f"Find the distribution of {col['name']}"
                ])
            
            if categorical_cols and numeric_cols:
                cat_col = categorical_cols[0]
                num_col = numeric_cols[0]
                suggestions.extend([
                    f"Compare {num_col['name']} by {cat_col['name']}",
                    f"Show me the top 10 {cat_col['name']} by {num_col['name']}"
                ])
        
        # Metric-based suggestions
        if metrics:
            for metric in metrics[:3]:
                suggestions.append(f"Calculate {metric.get('title', metric.get('name'))}")
        
        # Dimension-based suggestions
        if dimensions:
            for dimension in dimensions[:3]:
                suggestions.append(f"Group data by {dimension.get('title', dimension.get('name'))}")
        
        return {"suggestions": suggestions[:10]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-assistant/chat")
async def ai_assistant_chat(
    request: dict,
    db: Session = Depends(get_db)
):
    """AI Assistant chat endpoint with specialized assistant types"""
    from services.ai_service import ai_service
    
    try:
        message = request.get("message", "")
        assistant_type = request.get("assistant_type", "data_analyst")
        context = request.get("context", {})
        
        # Extract user ID
        user_id = "default_user"  # Replace with actual user ID extraction
        
        # Process based on assistant type
        if assistant_type == "sql_expert":
            result = await ai_service.generate_sql_query_with_context(
                prompt=message,
                user_id=user_id
            )
            
            response_content = f"""**SQL Query Generated:**

```sql
{result.get('sql', 'No query generated')}
```

**Explanation:** {result.get('explanation', 'No explanation available')}

**Confidence:** {result.get('confidence', 0) * 100:.1f}%"""

            return {
                "response": response_content,
                "generated_query": result.get("sql"),
                "confidence": result.get("confidence", 0),
                "data_source_used": result.get("data_source_used"),
                "actions": [{
                    "id": "execute_query",
                    "type": "execute_query",
                    "title": "Execute Query",
                    "description": "Run this query in the Query Builder",
                    "payload": {"sql": result.get("sql")}
                }] if result.get("sql") else []
            }
        
        elif assistant_type == "dashboard_designer":
            # Generate dashboard suggestions
            knowledge_base = context.get("knowledge_base", [])
            
            response_content = """**Dashboard Design Suggestions:**

🎨 **Recommended Visualizations:**
• Executive Summary Dashboard with key metrics
• Trend Analysis Dashboard for time-series data  
• Comparative Analysis Dashboard for segment comparisons
• Performance Monitoring Dashboard with KPIs

📊 **Chart Recommendations:**
• Bar charts for categorical comparisons
• Line charts for trends over time
• Pie charts for composition analysis  
• Metric cards for key performance indicators

Would you like me to create any specific dashboard or chart type?"""

            return {
                "response": response_content,
                "recommendations": [
                    "Create an executive summary dashboard",
                    "Design trend analysis visualizations", 
                    "Build comparative analysis charts",
                    "Set up KPI monitoring widgets"
                ],
                "actions": [{
                    "id": "create_dashboard",
                    "type": "create_dashboard", 
                    "title": "Create New Dashboard",
                    "description": "Open Dashboard Builder to create visualizations",
                    "payload": {"template": "executive_summary"}
                }]
            }
        
        elif assistant_type == "business_advisor":
            # Business intelligence analysis
            response_content = f"""**Business Intelligence Analysis:**

📈 **Strategic Insights:**
• Data-driven decision making opportunities identified
• Performance optimization recommendations available
• Market trend analysis suggestions provided
• ROI improvement strategies outlined

💡 **Key Recommendations:**
• Focus on data quality and completeness
• Implement regular performance monitoring  
• Establish clear KPI tracking systems
• Create automated reporting workflows

🎯 **Next Steps:**
• Define key business metrics to track
• Set up automated data pipelines
• Create executive dashboards
• Establish data governance processes

What specific business area would you like me to analyze?"""

            return {
                "response": response_content,
                "insights": [
                    "Data quality assessment needed",
                    "Performance monitoring gaps identified",
                    "Automation opportunities available",
                    "Executive reporting can be improved"
                ],
                "recommendations": [
                    "Establish KPI tracking dashboard",
                    "Implement automated reporting",
                    "Create executive summary views",
                    "Set up data quality monitoring"
                ]
            }
        
        else:  # data_analyst or default
            result = await ai_service.conversational_analysis(
                message=message,
                user_id=user_id,
                conversation_history=context.get("conversation_history", []),
                available_data_sources=context.get("available_data_sources", [])
            )
            
            return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai-assistant/conversations")
async def get_conversations(
    db: Session = Depends(get_db)
):
    """Get user's AI assistant conversations"""
    # This would typically fetch from database
    # For now, return empty list
    return []

@app.post("/api/ai-assistant/conversations")
async def save_conversation(
    conversation: dict,
    db: Session = Depends(get_db)
):
    """Save AI assistant conversation"""
    # This would typically save to database
    # For now, just return success
    return {"status": "saved", "id": conversation.get("id")}

@app.post("/api/dashboards/quick-create")
async def quick_create_dashboard(
    request: dict,
    db: Session = Depends(get_db)
):
    """Quick dashboard creation from AI suggestions"""
    try:
        # Extract dashboard configuration
        name = request.get("name", "AI Generated Dashboard")
        description = request.get("description", "Dashboard created by AI assistant")
        chart_config = request.get("chart_config", {})
        data_sources = request.get("data_sources", [])
        
        # Create a simple dashboard
        dashboard_id = f"dashboard_{int(time.time())}"
        
        # This would typically save to database
        # For now, just return success response
        
        return {
            "id": dashboard_id,
            "dashboard_name": name,
            "message": "Dashboard created successfully",
            "chart_type": chart_config.get("type", "unknown")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/status")
async def get_system_status():
    """Get system status and health information"""
    from services.data_source_registry import data_source_registry
    from services.notification_service import notification_service
    
    try:
        # Get system statistics
        stats = await data_source_registry.get_feature_statistics()
        
        return {
            "status": "healthy",
            "version": "2.0.0",
            "services": {
                "notification_service": "active",
                "data_registry": "active", 
                "ai_service": "active",
                "file_processor": "active"
            },
            "statistics": stats,
            "features": {
                "cross_feature_integration": True,
                "ai_powered_analysis": True,
                "auto_schema_generation": True,
                "real_time_sync": True
            }
        }
        
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e)
        }

# Static file serving (for production)
if os.getenv("ENVIRONMENT") == "production":
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["./"]
    )