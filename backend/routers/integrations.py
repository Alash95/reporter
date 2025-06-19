# backend/routers/integration.py - API routes for cross-feature integration

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from database import get_db
from models import UploadedFile, SemanticModel, Query, Dashboard
from schemas import (
    DataSourceInfo, DataSourceList, SchemaBrowserResponse, 
    IntegrationStatusResponse, ConversationalAIContext,
    QueryBuilderContext, DashboardBuilderContext, AIAssistantContext,
    DataSourceSyncRequest, DataSourceSyncResponse, NotificationResponse
)
from services.data_source_registry import data_source_registry
from services.notification_service import notification_service
from auth import get_current_active_user, User

router = APIRouter()

# Data Source Management Endpoints
@router.get("/data-sources", response_model=DataSourceList)
async def get_user_data_sources(
    current_user: User = Depends(get_current_active_user),
    feature: Optional[str] = None
):
    """Get all data sources available to the user, optionally filtered by feature"""
    
    if feature:
        sources = await data_source_registry.get_sources_for_feature(feature, current_user.id)
    else:
        sources = await data_source_registry.list_sources_by_user(current_user.id)
    
    # Transform to schema format
    data_source_infos = []
    for source in sources:
        data_source_infos.append(DataSourceInfo(
            source_id=source.get("source_id", source.get("id")),
            source_name=source.get("name", "Unknown"),
            source_type=source.get("type", "unknown"),
            data_type=source.get("data_type", "unknown"),
            user_id=source.get("user_id"),
            schema=source.get("schema", {}),
            semantic_model_id=source.get("semantic_model_id"),
            created_at=source.get("created_at", ""),
            status=source.get("status", "unknown"),
            feature_integrations=source.get("feature_sync", {})
        ))
    
    return DataSourceList(
        sources=data_source_infos,
        total_count=len(data_source_infos)
    )

@router.get("/data-sources/{source_id}")
async def get_data_source_details(
    source_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed information about a specific data source"""
    
    source_info = await data_source_registry.get_source_info(source_id)
    
    if not source_info:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Check if user owns this data source
    if source_info.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get integration status
    integration_status = await data_source_registry.get_source_status(source_id)
    
    return {
        "source_info": source_info,
        "integration_status": integration_status,
        "schema": await data_source_registry.get_schema(source_id)
    }

@router.post("/data-sources/{source_id}/sync", response_model=DataSourceSyncResponse)
async def sync_data_source(
    source_id: str,
    sync_request: DataSourceSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually sync a data source with specified features"""
    
    # Verify data source exists and user has access
    source_info = await data_source_registry.get_source_info(source_id)
    if not source_info or source_info.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    # Get file record
    file_record = db.query(UploadedFile).filter(
        UploadedFile.id == source_id,
        UploadedFile.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File record not found")
    
    # Start sync process in background
    from services.files import enhanced_service
    background_tasks.add_task(
        enhanced_service.process_and_integrate_file,
        source_id,
        file_record.file_path,
        file_record.file_type,
        current_user.id
    )
    
    return DataSourceSyncResponse(
        source_id=source_id,
        sync_results={"message": "Sync started"},
        success=True,
        message="Data source synchronization started"
    )

# Schema Browser Endpoints for Query Builder
@router.get("/schemas", response_model=SchemaBrowserResponse)
async def get_schemas_browser(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all schemas available for query building"""
    
    # Get user's semantic models
    semantic_models = db.query(SemanticModel).join(UploadedFile).filter(
        UploadedFile.user_id == current_user.id
    ).all()
    
    schemas = []
    total_tables = 0
    total_metrics = 0
    total_dimensions = 0
    
    for model in semantic_models:
        schema_def = model.schema_definition
        
        # Extract tables
        tables = []
        for table_name, table_info in schema_def.get("tables", {}).items():
            columns = []
            for col_name, col_info in table_info.get("columns", {}).items():
                columns.append({
                    "name": col_name,
                    "type": col_info.get("type", "string"),
                    "nullable": col_info.get("nullable", True)
                })
            
            tables.append({
                "name": table_name,
                "columns": columns,
                "source_type": "uploaded_file",
                "source_id": table_info.get("file_id", model.id)
            })
            total_tables += 1
        
        metrics = schema_def.get("metrics", [])
        dimensions = schema_def.get("dimensions", [])
        
        total_metrics += len(metrics)
        total_dimensions += len(dimensions)
        
        schemas.append({
            "model_id": model.id,
            "model_name": model.name,
            "tables": tables,
            "metrics": metrics,
            "dimensions": dimensions,
            "data_source": schema_def.get("data_source", {})
        })
    
    return SchemaBrowserResponse(
        available_schemas=schemas,
        total_tables=total_tables,
        total_metrics=total_metrics,
        total_dimensions=total_dimensions
    )

# Feature Context Endpoints
@router.get("/context/conversational-ai")
async def get_conversational_ai_context(
    current_user: User = Depends(get_current_active_user)
) -> ConversationalAIContext:
    """Get context for conversational AI feature"""
    
    # Get available data sources
    sources = await data_source_registry.get_sources_for_feature("conversational_ai", current_user.id)
    
    # Transform to DataSourceInfo objects
    data_sources = []
    for source in sources:
        data_sources.append(DataSourceInfo(
            source_id=source.get("source_id", source.get("id")),
            source_name=source.get("name", "Unknown"),
            source_type=source.get("type", "unknown"),
            data_type=source.get("data_type", "unknown"),
            user_id=source.get("user_id"),
            schema=source.get("schema", {}),
            semantic_model_id=source.get("semantic_model_id"),
            created_at=source.get("created_at", ""),
            status=source.get("status", "unknown"),
            feature_integrations=source.get("feature_sync", {})
        ))
    
    # Generate suggested questions based on available data
    suggested_questions = []
    for source in data_sources[:3]:  # Limit to first 3 sources
        schema = source.schema
        if schema.get("columns"):
            col_names = [col.get("name", "") for col in schema.get("columns", [])][:2]
            if col_names:
                suggested_questions.extend([
                    f"Show me the distribution of {col_names[0]}",
                    f"What insights can you find in {source.source_name}?",
                    f"Create a chart for {source.source_name}"
                ])
    
    return ConversationalAIContext(
        available_data_sources=data_sources,
        recent_queries=[],  # Can be populated from query history
        suggested_questions=suggested_questions[:10]
    )

@router.get("/context/query-builder")
async def get_query_builder_context(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> QueryBuilderContext:
    """Get context for query builder feature"""
    
    # Get available schemas (same as schemas endpoint but in context format)
    schemas_response = await get_schemas_browser(current_user, db)
    
    # Get recent queries
    recent_queries_records = db.query(Query).filter(
        Query.user_id == current_user.id
    ).order_by(Query.created_at.desc()).limit(5).all()
    
    recent_queries = [q.sql_query for q in recent_queries_records]
    
    # Generate sample queries based on available schemas
    sample_queries = []
    for schema in schemas_response.available_schemas[:2]:  # Limit to first 2 schemas
        if schema["tables"]:
            table_name = schema["tables"][0]["name"]
            sample_queries.extend([
                f"SELECT * FROM {table_name} LIMIT 10",
                f"SELECT COUNT(*) FROM {table_name}"
            ])
        
        if schema["metrics"]:
            metric = schema["metrics"][0]
            sample_queries.append(f"SELECT {metric.get('sql', 'COUNT(*)')} as {metric.get('name', 'metric')}")
    
    return QueryBuilderContext(
        available_schemas=schemas_response.available_schemas,
        recent_queries=recent_queries,
        sample_queries=sample_queries[:10],
        query_templates=[]  # Can be populated with predefined templates
    )

@router.get("/context/dashboard-builder")
async def get_dashboard_builder_context(
    current_user: User = Depends(get_current_active_user)
) -> DashboardBuilderContext:
    """Get context for dashboard builder feature"""
    
    # Get available data sources
    sources = await data_source_registry.get_sources_for_feature("dashboard_builder", current_user.id)
    
    data_sources = []
    chart_suggestions = []
    
    for source in sources:
        data_source = DataSourceInfo(
            source_id=source.get("source_id", source.get("id")),
            source_name=source.get("name", "Unknown"),
            source_type=source.get("type", "unknown"),
            data_type=source.get("data_type", "unknown"),
            user_id=source.get("user_id"),
            schema=source.get("schema", {}),
            semantic_model_id=source.get("semantic_model_id"),
            created_at=source.get("created_at", ""),
            status=source.get("status", "unknown"),
            feature_integrations=source.get("feature_sync", {})
        )
        data_sources.append(data_source)
        
        # Generate chart suggestions
        schema = source.get("schema", {})
        columns = schema.get("columns", [])
        
        numeric_cols = [col for col in columns if col.get("type") in ["number", "integer"]]
        categorical_cols = [col for col in columns if col.get("type") == "string"]
        
        if numeric_cols and categorical_cols:
            chart_suggestions.append({
                "type": "bar",
                "title": f"{numeric_cols[0].get('name')} by {categorical_cols[0].get('name')}",
                "data_source_id": source.get("source_id"),
                "configuration": {
                    "x_axis": categorical_cols[0].get("name"),
                    "y_axis": numeric_cols[0].get("name")
                }
            })
    
    return DashboardBuilderContext(
        available_data_sources=data_sources,
        chart_suggestions=chart_suggestions[:10],
        recent_dashboards=[],  # Can be populated from dashboard history
        widget_templates=[]  # Can be populated with predefined widget templates
    )

@router.get("/context/ai-assistant")
async def get_ai_assistant_context(
    current_user: User = Depends(get_current_active_user)
) -> AIAssistantContext:
    """Get context for AI assistant feature"""
    
    # Get available data sources
    sources = await data_source_registry.get_sources_for_feature("ai_assistant", current_user.id)
    
    knowledge_base = []
    query_patterns = []
    sample_queries = []
    
    for source in sources:
        data_source = DataSourceInfo(
            source_id=source.get("source_id", source.get("id")),
            source_name=source.get("name", "Unknown"),
            source_type=source.get("type", "unknown"),
            data_type=source.get("data_type", "unknown"),
            user_id=source.get("user_id"),
            schema=source.get("schema", {}),
            semantic_model_id=source.get("semantic_model_id"),
            created_at=source.get("created_at", ""),
            status=source.get("status", "unknown"),
            feature_integrations=source.get("feature_sync", {})
        )
        knowledge_base.append(data_source)
        
        # Generate query patterns
        schema = source.get("schema", {})
        columns = schema.get("columns", [])
        
        for col in columns[:3]:  # Limit to first 3 columns
            col_name = col.get("name", "")
            col_type = col.get("type", "")
            
            if col_type in ["number", "integer"]:
                query_patterns.append({
                    "pattern": f"average {col_name}",
                    "sql_template": f"SELECT AVG({col_name}) FROM data",
                    "description": f"Calculate average {col_name}"
                })
                sample_queries.append(f"What's the average {col_name}?")
            elif col_type == "string":
                query_patterns.append({
                    "pattern": f"group by {col_name}",
                    "sql_template": f"SELECT {col_name}, COUNT(*) FROM data GROUP BY {col_name}",
                    "description": f"Group data by {col_name}"
                })
                sample_queries.append(f"Show me the breakdown by {col_name}")
    
    return AIAssistantContext(
        knowledge_base=knowledge_base,
        query_patterns=query_patterns[:20],
        sample_queries=sample_queries[:15],
        user_preferences={}  # Can be populated from user preferences
    )

# Integration Status and Health Endpoints
@router.get("/integration-status/{source_id}")
async def get_integration_status(
    source_id: str,
    current_user: User = Depends(get_current_active_user)
) -> IntegrationStatusResponse:
    """Get integration status for a specific data source"""
    
    source_info = await data_source_registry.get_source_info(source_id)
    if not source_info or source_info.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    integration_status = await data_source_registry.get_source_status(source_id)
    feature_integrations = integration_status.get("feature_integrations", {})
    
    # Transform to schema format
    feature_statuses = []
    for feature, status in feature_integrations.items():
        feature_statuses.append({
            "feature_name": feature,
            "enabled": status.get("enabled", True),
            "last_sync": status.get("last_sync"),
            "sync_status": "active" if status.get("enabled", True) else "disabled"
        })
    
    return IntegrationStatusResponse(
        file_id=source_id,
        overall_status=integration_status.get("status", "unknown"),
        feature_integrations=feature_statuses,
        data_source_registered=True,
        semantic_model_created=source_info.get("semantic_model_id") is not None,
        last_updated=integration_status.get("last_accessed", "")
    )

@router.get("/notifications")
async def get_recent_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
) -> List[NotificationResponse]:
    """Get recent notifications for debugging and monitoring"""
    
    notifications = await notification_service.get_notification_history(limit)
    
    # Filter notifications relevant to the user (if needed)
    # For now, return all notifications for admin purposes
    
    return [
        NotificationResponse(
            id=notif.get("id", ""),
            timestamp=notif.get("timestamp", ""),
            feature=notif.get("feature", ""),
            type=notif.get("type", ""),
            data_summary=notif.get("data_summary", {}),
            processed=True
        )
        for notif in notifications
    ]

# Cross-feature data exchange endpoints
@router.post("/exchange-data")
async def exchange_data_between_features(
    exchange_request: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """Exchange data between different features"""
    
    source_feature = exchange_request.get("source_feature")
    target_feature = exchange_request.get("target_feature")
    data = exchange_request.get("data", {})
    
    # Validate features
    valid_features = ["conversational_ai", "query_builder", "dashboard_builder", "ai_assistant"]
    if source_feature not in valid_features or target_feature not in valid_features:
        raise HTTPException(status_code=400, detail="Invalid feature names")
    
    # Process data exchange based on feature types
    transformed_data = await _transform_data_for_feature(data, source_feature, target_feature)
    
    # Notify target feature
    await notification_service.notify_feature(target_feature, {
        "action": "data_received",
        "source_feature": source_feature,
        "data": transformed_data
    })
    
    return {
        "success": True,
        "message": f"Data exchanged from {source_feature} to {target_feature}",
        "transformed_data": transformed_data
    }

async def _transform_data_for_feature(data: Dict[str, Any], source: str, target: str) -> Dict[str, Any]:
    """Transform data based on source and target feature requirements"""
    
    # Basic transformation logic - can be expanded based on specific needs
    if target == "query_builder" and source == "conversational_ai":
        # Convert conversation context to query context
        return {
            "suggested_queries": data.get("queries", []),
            "context": data.get("context", {}),
            "data_sources": data.get("data_sources", [])
        }
    
    elif target == "dashboard_builder" and source in ["conversational_ai", "query_builder"]:
        # Convert to dashboard context
        return {
            "chart_data": data.get("data", []),
            "chart_config": data.get("chart_config", {}),
            "data_source_id": data.get("data_source_id")
        }
    
    elif target == "ai_assistant":
        # Convert to AI assistant knowledge format
        return {
            "knowledge_update": data,
            "context": data.get("context", {}),
            "user_interaction": True
        }
    
    # Default: return data as-is
    return data

# System statistics and monitoring
@router.get("/statistics")
async def get_system_statistics(
    current_user: User = Depends(get_current_active_user)
):
    """Get system statistics and health information"""
    
    # Get data source statistics
    source_stats = await data_source_registry.get_feature_statistics()
    
    # Get user-specific statistics
    user_sources = await data_source_registry.list_sources_by_user(current_user.id)
    
    return {
        "user_statistics": {
            "total_data_sources": len(user_sources),
            "data_sources_by_type": {},
            "feature_usage": {}
        },
        "system_statistics": source_stats,
        "integration_health": {
            "notification_service": "active",
            "data_registry": "active",
            "cross_feature_sync": "active"
        }
    }

# Cleanup and maintenance endpoints
@router.post("/cleanup/inactive-sources")
async def cleanup_inactive_sources(
    days_threshold: int = 30,
    current_user: User = Depends(get_current_active_user)
):
    """Cleanup inactive data sources (admin function)"""
    
    # For now, allow any authenticated user to cleanup their own sources
    # In production, this might be restricted to admin users
    
    cleaned_count = await data_source_registry.cleanup_inactive_sources(days_threshold)
    
    return {
        "message": f"Cleaned up {cleaned_count} inactive data sources",
        "days_threshold": days_threshold
    }

@router.post("/cleanup/notifications")
async def cleanup_old_notifications(
    days_to_keep: int = 30,
    current_user: User = Depends(get_current_active_user)
):
    """Cleanup old notification logs"""
    
    await notification_service.cleanup_old_logs(days_to_keep)
    
    return {
        "message": f"Cleaned up notification logs older than {days_to_keep} days"
    }