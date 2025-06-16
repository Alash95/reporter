from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    tenant_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# File schemas
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str

class FileListResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    processing_status: str
    created_at: datetime
    has_semantic_model: bool

class FileProcessingStatus(BaseModel):
    file_id: str
    status: str
    extracted_data: Optional[Dict[str, Any]] = None
    semantic_model_id: Optional[str] = None

# Dashboard schemas
class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    widgets: Optional[List[Dict[str, Any]]] = None
    is_public: bool = False

class DashboardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    is_public: bool
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Widget schemas
class WidgetCreate(BaseModel):
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source: Dict[str, Any]
    position: Dict[str, Any]

class WidgetResponse(BaseModel):
    id: str
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source: Dict[str, Any]
    position: Dict[str, Any]
    dashboard_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Insight schemas
class InsightGenerate(BaseModel):
    data_source_type: str  # "file" or "query"
    data_source_id: str

class InsightResponse(BaseModel):
    id: str
    title: str
    content: str
    insight_type: str
    data_source: Dict[str, Any]
    confidence_score: float
    is_automated: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Semantic Model schemas
class SemanticModelBase(BaseModel):
    name: str
    description: Optional[str] = None
    schema_definition: Dict[str, Any]

class SemanticModelCreate(SemanticModelBase):
    pass

class SemanticModel(SemanticModelBase):
    id: str
    tenant_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Query schemas
class QueryBase(BaseModel):
    name: Optional[str] = None
    sql_query: str
    model_id: Optional[str] = None

class QueryCreate(QueryBase):
    pass

class QueryExecute(BaseModel):
    sql: str
    model_id: Optional[str] = None
    use_cache: bool = True

class QueryResult(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[Dict[str, str]]
    row_count: int
    execution_time: float
    query_id: str
    from_cache: bool = False

class Query(QueryBase):
    id: str
    user_id: str
    execution_time: Optional[float]
    row_count: Optional[int]
    status: str
    error_message: Optional[str]
    natural_language_query: Optional[str]
    ai_generated: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# AI Query schemas
class AIQueryRequest(BaseModel):
    prompt: str
    model_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AIQueryResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float
    template_used: Optional[str] = None
    suggested_charts: Optional[List[Dict[str, Any]]] = None

# Conversation schemas
class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class ConversationCreate(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class ConversationResponse(BaseModel):
    id: str
    messages: List[ConversationMessage]
    context: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True