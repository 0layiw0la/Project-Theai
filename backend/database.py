import os
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    status = Column(String, default="PENDING")
    result = Column(JSON, nullable=True)
    patient_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    sex = Column(String, nullable=True)
    date = Column(String, nullable=True)
    image_urls = Column(String, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    last_chat_history = Column(String, nullable=True)
    ai_report = Column(Text, nullable=True)  # ✅ NEW: Cached AI report

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()