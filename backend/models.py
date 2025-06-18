from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uploaded_files = relationship("UploadedFile", back_populates="user")
    dashboards = relationship("Dashboard", back_populates="user")
    queries = relationship("Query", back_populates="user")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    processing_status = Column(String, default="pending")
    extracted_data = Column(JSON)
    file_metadata = Column(JSON)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    semantic_model_id = Column(String, ForeignKey("semantic_models.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="uploaded_files")
    semantic_model = relationship("SemanticModel", back_populates="files")

class SemanticModel(Base):
    __tablename__ = "semantic_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    schema_definition = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    files = relationship("UploadedFile", back_populates="semantic_model")
    queries = relationship("Query", back_populates="semantic_model")

class Query(Base):
    __tablename__ = "queries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    sql_query = Column(Text, nullable=False)
    execution_time = Column(Float)
    row_count = Column(Integer)
    status = Column(String, default="pending")
    error_message = Column(Text)
    result_data = Column(JSON)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    model_id = Column(String, ForeignKey("semantic_models.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="queries")
    semantic_model = relationship("SemanticModel", back_populates="queries")

class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    layout = Column(JSON, default={})
    widgets = Column(JSON, default=[])
    is_public = Column(Boolean, default=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="dashboards")
    dashboard_widgets = relationship("Widget", back_populates="dashboard")

class Widget(Base):
    __tablename__ = "widgets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    widget_type = Column(String, nullable=False)
    configuration = Column(JSON, default={})
    data_source = Column(JSON)
    position = Column(JSON, default={})
    dashboard_id = Column(String, ForeignKey("dashboards.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="dashboard_widgets")

class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    insight_type = Column(String, nullable=False)
    data_source_id = Column(String, nullable=False)
    data_source_type = Column(String, nullable=False)
    file_metadata = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)