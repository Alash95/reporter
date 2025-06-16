from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
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

class Query(Base):
    __tablename__ = "queries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    sql_query = Column(Text, nullable=False)
    model_id = Column(String, ForeignKey("semantic_models.id"))
    user_id = Column(String, ForeignKey("users.id"))
    execution_time = Column(Float)
    row_count = Column(Integer)
    status = Column(String, default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    model = relationship("SemanticModel", backref="queries")
    user = relationship("User", backref="queries")

class QueryCache(Base):
    __tablename__ = "query_cache"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_hash = Column(String, unique=True, index=True)
    result_data = Column(JSON)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)