import os
from sqlalchemy import inspect, create_engine, Column, Text, DateTime, JSON, Text
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
    
    id = Column(Text, primary_key=True)
    username = Column(Text, unique=True, index=True)
    email = Column(Text, unique=True, index=True)
    hashed_password = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Text, primary_key=True)
    user_id = Column(Text, index=True)
    status = Column(Text, default="PENDING")
    result = Column(JSON, nullable=True)
    patient_name = Column(Text, nullable=True)
    phone_number = Column(Text, nullable=True)
    sex = Column(Text, nullable=True)
    date = Column(Text, nullable=True)
    image_urls = Column(Text, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    last_chat_history = Column(Text, nullable=True)
    ai_report = Column(Text, nullable=True)  # ✅ NEW: Cached AI report

try:
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    required_tables = ['users', 'tasks']
    missing_tables = [table for table in required_tables if table not in existing_tables]
    
    if missing_tables:
        print(f"🔧 Creating missing tables: {missing_tables}")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
    else:
        print("✅ All required tables already exist - skipping creation")
        
except Exception as e:
    print(f"❌ Database check/creation failed: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()