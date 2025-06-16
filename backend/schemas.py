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
    created_at: datetime
    
    class Config:
        from_attributes = True

# AI Query schemas
class AIQueryRequest(BaseModel):
    prompt: str
    model_id: Optional[str] = None

class AIQueryResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float
    template_used: Optional[str] = None