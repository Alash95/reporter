# backend/schemas.py - Enhanced schemas for cross-feature integration

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Any, Dict
from datetime import datetime

# Enhanced File schemas with integration support
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str
    integration_enabled: bool = True

class FileListResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    processing_status: str
    created_at: datetime
    has_semantic_model: bool
    integration_status: Optional[Dict[str, Any]] = None

class FileProcessingStatus(BaseModel):
    file_id: str
    status: str
    extracted_data: Optional[Dict[str, Any]] = None
    semantic_model_id: Optional[str] = None
    integration_status: Optional[Dict[str, Any]] = None

# Data Source Registry schemas
class DataSourceInfo(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    data_type: str
    user_id: str
    schema: Dict[str, Any]
    semantic_model_id: Optional[str] = None
    created_at: str
    status: str
    feature_integrations: Dict[str, Any]

class DataSourceList(BaseModel):
    sources: List[DataSourceInfo]
    total_count: int
    available_features: List[str] = ["conversational_ai", "query_builder", "dashboard_builder", "ai_assistant"]

# Enhanced Query schemas with data source integration
class QueryCreate(BaseModel):
    name: Optional[str] = None
    sql_query: str
    model_id: Optional[str] = None
    data_source_id: Optional[str] = None

class QueryExecute(BaseModel):
    sql: str
    model_id: Optional[str] = None
    data_source_id: Optional[str] = None
    use_cache: bool = True

class QueryResult(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[Dict[str, Any]]
    row_count: int
    execution_time: float
    query_id: str
    from_cache: bool = False
    data_source_info: Optional[Dict[str, Any]] = None

# Enhanced AI schemas with context awareness
class AIQueryRequest(BaseModel):
    prompt: str
    model_id: Optional[str] = None
    data_source_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AIQueryResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float
    data_source_used: Optional[str] = None
    suggested_visualizations: Optional[List[Dict[str, Any]]] = None

class ConversationalAIRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    available_data_sources: Optional[List[str]] = None

class ConversationalAIResponse(BaseModel):
    response: str
    generated_query: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    suggested_chart: Optional[Dict[str, Any]] = None
    insights: Optional[List[str]] = None
    analysis: Optional[Dict[str, Any]] = None
    data_sources_used: Optional[List[str]] = None

# Enhanced Dashboard schemas with automatic data source integration
class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    layout: Optional[Dict[str, Any]] = {}
    widgets: Optional[List[Dict[str, Any]]] = []
    data_sources: Optional[List[str]] = []
    is_public: bool = False

class DashboardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    data_sources: List[Dict[str, Any]]
    is_public: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class WidgetCreate(BaseModel):
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source_id: Optional[str] = None
    data_source: Optional[Dict[str, Any]] = None
    position: Dict[str, Any]

class WidgetResponse(BaseModel):
    id: str
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source_id: Optional[str]
    data_source: Optional[Dict[str, Any]]
    position: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Enhanced Semantic Model schemas with auto-generation support
class SemanticModelCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    schema_definition: Dict[str, Any]
    auto_generated: bool = False
    source_file_id: Optional[str] = None

class SemanticModelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    schema_definition: Dict[str, Any]
    auto_generated: bool
    source_file_id: Optional[str]
    created_at: datetime
    tables: List[Dict[str, Any]]
    metrics: List[Dict[str, Any]]
    dimensions: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# Schema Browser schemas for Query Builder
class TableSchema(BaseModel):
    name: str
    columns: List[Dict[str, Any]]
    source_type: str
    source_id: str
    row_count: Optional[int] = None

class SchemaInfo(BaseModel):
    model_id: str
    model_name: str
    tables: List[TableSchema]
    metrics: List[Dict[str, Any]]
    dimensions: List[Dict[str, Any]]
    data_source: Dict[str, Any]

class SchemaBrowserResponse(BaseModel):
    available_schemas: List[SchemaInfo]
    total_tables: int
    total_metrics: int
    total_dimensions: int

# Integration Status schemas
class FeatureIntegrationStatus(BaseModel):
    feature_name: str
    enabled: bool
    last_sync: Optional[str] = None
    sync_status: str = "active"
    error_message: Optional[str] = None

class IntegrationStatusResponse(BaseModel):
    file_id: str
    overall_status: str
    feature_integrations: List[FeatureIntegrationStatus]
    data_source_registered: bool
    semantic_model_created: bool
    last_updated: str

# Notification schemas
class NotificationCreate(BaseModel):
    feature_name: str
    notification_type: str
    data: Dict[str, Any]

class NotificationResponse(BaseModel):
    id: str
    timestamp: str
    feature: str
    type: str
    data_summary: Dict[str, Any]
    processed: bool = True

# Data Source Management schemas
class DataSourceSyncRequest(BaseModel):
    source_id: str
    features: List[str]
    force_refresh: bool = False

class DataSourceSyncResponse(BaseModel):
    source_id: str
    sync_results: Dict[str, Any]
    success: bool
    message: str

# Feature-specific context schemas
class ConversationalAIContext(BaseModel):
    available_data_sources: List[DataSourceInfo]
    recent_queries: List[str]
    suggested_questions: List[str]
    current_session_data: Optional[Dict[str, Any]] = None

class QueryBuilderContext(BaseModel):
    available_schemas: List[SchemaInfo]
    recent_queries: List[str]
    sample_queries: List[str]
    query_templates: List[Dict[str, Any]]

class DashboardBuilderContext(BaseModel):
    available_data_sources: List[DataSourceInfo]
    chart_suggestions: List[Dict[str, Any]]
    recent_dashboards: List[str]
    widget_templates: List[Dict[str, Any]]

class AIAssistantContext(BaseModel):
    knowledge_base: List[DataSourceInfo]
    query_patterns: List[Dict[str, Any]]
    sample_queries: List[str]
    user_preferences: Dict[str, Any]

# Cross-feature data exchange schemas
class DataExchangeRequest(BaseModel):
    source_feature: str
    target_feature: str
    data_type: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class DataExchangeResponse(BaseModel):
    success: bool
    message: str
    transformed_data: Optional[Dict[str, Any]] = None

# Analytics and insights schemas
class InsightGenerate(BaseModel):
    data_source_id: str
    data_source_type: str
    auto_generated: bool = False

class InsightResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    insight_type: str
    data_source_id: str
    insights: List[str]
    visualizations: List[Dict[str, Any]]
    recommendations: List[str]
    confidence_score: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# System health and monitoring schemas
class SystemHealthCheck(BaseModel):
    service_name: str
    status: str
    last_check: str
    details: Dict[str, Any]

class IntegrationHealthResponse(BaseModel):
    overall_status: str
    services: List[SystemHealthCheck]
    data_sources_count: int
    active_integrations: int
    last_updated: str

# User preference schemas for personalization
class UserPreferences(BaseModel):
    user_id: str
    preferred_chart_types: List[str]
    default_data_sources: List[str]
    ai_assistance_level: str = "standard"  # minimal, standard, advanced
    notification_settings: Dict[str, bool]

class UserPreferencesResponse(BaseModel):
    user_id: str
    preferences: UserPreferences
    personalized_suggestions: List[str]
    recommended_features: List[str]

# Validation schemas
class FileValidationResult(BaseModel):
    is_valid: bool
    file_type: str
    estimated_processing_time: int
    supported_features: List[str]
    warnings: List[str]
    requirements: Dict[str, Any]

class SchemaValidationResult(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]
    compatibility: Dict[str, bool]
    
    
class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
# Feature compatibility

# Add at the bottom of schemas.py

class SemanticModelBase(BaseModel):
    model_id: str
    model_name: str
    schema: dict  # Or a more specific type if you know the structure

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }

class SemanticModelCreate(SemanticModelBase):
    pass

class SemanticModel(SemanticModelBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Query(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    sql: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


class ProblemStatementRequest(BaseModel):
    problem_statement: str
    file_id: str
    preferences: Optional[Dict] = {}

# ====== AI Dashboard Generation ======
class DashboardGenerationResponse(BaseModel):
    dashboard_id: str
    insights: List[str]
    chart_recommendations: List[dict]


# ====== Semantic Model Schemas (Optional) ======
class SemanticModelBase(BaseModel):
    model_id: str
    model_name: str
    schema: dict

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


# Request/Response models for the new integration endpoints

class DataSourceSyncRequest(BaseModel):
    """Request model for syncing data sources"""
    features: Optional[List[str]] = None  # Features to sync with, default to all
    force_refresh: bool = False
    options: Dict[str, Any] = {}

class DataSourceSyncResponse(BaseModel):
    """Response model for sync operations"""
    sync_id: str
    status: str
    message: str
    started_at: Optional[str] = None

class IntegrationInfo(BaseModel):
    """Model for integration information"""
    id: str
    name: str
    type: str
    status: str
    last_sync: Optional[str] = None
    sync_frequency: str
    records_count: int
    health_score: float
    features_connected: List[str]
    configuration: Dict[str, Any]

class IntegrationMetrics(BaseModel):
    """Model for integration metrics"""
    total_integrations: int
    active_integrations: int
    failed_integrations: int
    total_records_synced: int
    avg_sync_time: int  # in milliseconds
    uptime_percentage: float
    last_updated: str

class SyncActivity(BaseModel):
    """Model for sync activity records"""
    id: str
    integration_name: str
    status: str
    timestamp: str
    records_processed: int
    duration_ms: int
    error_details: Optional[str] = None

class IntegrationStatusOverview(BaseModel):
    """Overall integration status response"""
    integrations: List[IntegrationInfo]
    total_count: int
    status: str

class IntegrationActivityResponse(BaseModel):
    """Response for integration activity"""
    activities: List[SyncActivity]
    total_count: int

class TableColumn(BaseModel):
    """Database table column definition"""
    name: str
    type: str
    description: Optional[str] = None

class TableSchema(BaseModel):
    """Database table schema"""
    name: str
    columns: List[TableColumn]

class DataSourceSchema(BaseModel):
    """Data source schema information"""
    model_id: str
    model_name: str
    description: Optional[str] = None
    tables: List[TableSchema]

class QueryTemplate(BaseModel):
    """SQL query template"""
    name: str
    template: str
    description: str

class SuggestedQuery(BaseModel):
    """Suggested query for query builder"""
    query: str
    description: str

class QueryBuilderContext(BaseModel):
    """Context data for query builder"""
    available_schemas: List[DataSourceSchema]
    suggested_queries: List[SuggestedQuery]
    sql_templates: List[QueryTemplate]

class AvailableQuery(BaseModel):
    """Available query for dashboard builder"""
    query_id: str
    query_name: str
    sql: str
    last_run: Optional[str] = None

class ExistingDashboard(BaseModel):
    """Existing dashboard info"""
    dashboard_id: str
    name: str
    description: Optional[str] = None

class DashboardBuilderContext(BaseModel):
    """Context data for dashboard builder"""
    available_queries: List[AvailableQuery]
    existing_dashboards: List[ExistingDashboard]
    chart_types: List[str]

class KnowledgeBaseItem(BaseModel):
    """Knowledge base item for AI assistant"""
    type: str
    name: str
    description: str

class QueryPattern(BaseModel):
    """Query pattern for AI assistant"""
    pattern: str
    sql_template: str
    description: str

class AIAssistantContext(BaseModel):
    """Context data for AI assistant"""
    knowledge_base: List[KnowledgeBaseItem]
    query_patterns: List[QueryPattern]
    sample_queries: List[str]
    user_preferences: Dict[str, Any]

class ConversationalAIContext(BaseModel):
    """Context data for conversational AI"""
    available_schemas: List[DataSourceSchema]
    sample_questions: List[str]
    conversation_history: List[Dict[str, Any]]

class FeatureIntegrationStatus(BaseModel):
    """Feature integration status"""
    feature_name: str
    enabled: bool
    last_sync: Optional[str] = None
    sync_status: str

class IntegrationStatusResponse(BaseModel):
    """Integration status for a specific data source"""
    file_id: str
    overall_status: str
    feature_integrations: List[FeatureIntegrationStatus]
    data_source_registered: bool
    semantic_model_created: bool
    last_updated: str

class NotificationResponse(BaseModel):
    """Notification response model"""
    id: str
    timestamp: str
    feature: str
    type: str
    data_summary: Dict[str, Any]
    processed: bool

class DataSourceInfo(BaseModel):
    """Data source information model"""
    source_id: str
    source_name: str
    source_type: str
    data_type: str
    user_id: str
    schema: Dict[str, Any]
    semantic_model_id: Optional[str] = None
    created_at: str
    status: str
    feature_integrations: Dict[str, Any]

class DataSourceList(BaseModel):
    """List of data sources"""
    sources: List[DataSourceInfo]
    total_count: int

class SystemStatistics(BaseModel):
    """System statistics response"""
    user_statistics: Dict[str, Any]
    system_statistics: Dict[str, Any]
    integration_health: Dict[str, str]

class DataExchangeRequest(BaseModel):
    """Request for cross-feature data exchange"""
    source_feature: str
    target_feature: str
    data: Dict[str, Any]

class DataExchangeResponse(BaseModel):
    """Response for cross-feature data exchange"""
    status: str
    message: str
    data_summary: Dict[str, Any]

class CleanupResponse(BaseModel):
    """Response for cleanup operations"""
    message: str
    items_cleaned: Optional[int] = None
    days_threshold: Optional[int] = None

# Schema Browser Response
class SchemaBrowserResponse(BaseModel):
    """Schema browser response"""
    schemas: List[DataSourceSchema]
    total_schemas: int