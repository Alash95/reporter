from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Any, Dict
from datetime import datetime

# User schemas with validation
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

    @validator('full_name')
    def validate_full_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters long')
        if len(v.strip()) > 100:
            raise ValueError('Full name must be less than 100 characters')
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        if len(v) > 100:
            raise ValueError('Password must be less than 100 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
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

# Query schemas
class QueryCreate(BaseModel):
    name: Optional[str] = None
    sql_query: str
    model_id: Optional[str] = None

class QueryExecute(BaseModel):
    sql: str
    model_id: Optional[str] = None
    use_cache: bool = True

class QueryResult(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[Dict[str, Any]]
    row_count: int
    execution_time: float
    query_id: str
    from_cache: bool = False

class Query(BaseModel):
    id: str
    name: Optional[str]
    sql_query: str
    execution_time: Optional[float]
    row_count: Optional[int]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# AI schemas
class AIQueryRequest(BaseModel):
    prompt: str
    model_id: Optional[str] = None

class AIQueryResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float

class ProblemStatementRequest(BaseModel):
    problem_statement: str
    file_id: str
    preferences: Optional[Dict[str, Any]] = {}

class DashboardGenerationResponse(BaseModel):
    dashboard_id: str
    insights: List[str]
    suggested_visualizations: List[Dict[str, Any]]
    generated_code: str
    explanation: str

# Dashboard schemas
class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    layout: Optional[Dict[str, Any]] = {}
    widgets: Optional[List[Dict[str, Any]]] = []
    is_public: bool = False

class DashboardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    is_public: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class WidgetCreate(BaseModel):
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source: Optional[Dict[str, Any]] = None
    position: Dict[str, Any]

class WidgetResponse(BaseModel):
    id: str
    name: str
    widget_type: str
    configuration: Dict[str, Any]
    data_source: Optional[Dict[str, Any]]
    position: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Semantic Model schemas
class SemanticModelCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    schema_definition: Dict[str, Any]

class SemanticModel(BaseModel):
    id: str
    name: str
    description: Optional[str]
    schema_definition: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Insight schemas
class InsightGenerate(BaseModel):
    data_source_id: str
    data_source_type: str

class InsightResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    insight_type: str
    metadata: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True