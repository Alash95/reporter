from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    tenant_id = Column(String, default="default")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SemanticModel(Base):
    __tablename__ = "semantic_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    schema_definition = Column(JSON)
    tenant_id = Column(String, nullable=False)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    creator = relationship("User", backref="models")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # csv, xlsx, pdf, docx, txt
    file_size = Column(Integer)
    file_path = Column(String, nullable=False)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    extracted_data = Column(JSON)  # Parsed data structure
    semantic_model_id = Column(String, ForeignKey("semantic_models.id"))
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="uploaded_files")
    semantic_model = relationship("SemanticModel", backref="files")

class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    layout = Column(JSON)  # Grid layout configuration
    widgets = Column(JSON)  # Widget configurations
    is_public = Column(Boolean, default=False)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="dashboards")

class Widget(Base):
    __tablename__ = "widgets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    widget_type = Column(String, nullable=False)  # chart, metric, table, text
    configuration = Column(JSON)  # Chart config, query, styling
    data_source = Column(JSON)  # Query or file reference
    dashboard_id = Column(String, ForeignKey("dashboards.id"))
    position = Column(JSON)  # Grid position and size
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    dashboard = relationship("Dashboard", backref="dashboard_widgets")

class Query(Base):
    __tablename__ = "queries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    sql_query = Column(Text, nullable=False)
    natural_language_query = Column(Text)  # Original user question
    model_id = Column(String, ForeignKey("semantic_models.id"))
    user_id = Column(String, ForeignKey("users.id"))
    execution_time = Column(Float)
    row_count = Column(Integer)
    status = Column(String, default="pending")
    error_message = Column(Text)
    result_data = Column(JSON)  # Store query results
    ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    model = relationship("SemanticModel", backref="queries")
    user = relationship("User", backref="queries")

class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # AI-generated insight text
    insight_type = Column(String, nullable=False)  # trend, anomaly, summary, recommendation
    data_source = Column(JSON)  # Reference to query or file
    confidence_score = Column(Float)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, nullable=False)
    is_automated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="insights")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, nullable=False)
    messages = Column(JSON)  # Array of conversation messages
    context = Column(JSON)  # Conversation context and memory
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="conversations")

class QueryCache(Base):
    __tablename__ = "query_cache"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_hash = Column(String, unique=True, index=True)
    result_data = Column(JSON)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)