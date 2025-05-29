import os
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Response, Cookie, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from ultralytics import YOLO
from functions import calculate_parasite_density
from celery_app import celery_app
from tasks import process_malaria_images



# SQLAlchemy setup
DATABASE_URL = "sqlite:///./theai.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
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
    date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
# Create tables
Base.metadata.create_all(bind=engine)

# Auth
load_dotenv()  
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "YOUR_SECRET_KEY")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(title="Parasite Density API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Authentication utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Auth endpoints
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

@app.post("/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = db.query(User).filter(User.email == user.email).first()  # Change from email to user.email
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)  # Change from password to user.password
    new_user = User(id=user_id, username=user.username, email=user.email, hashed_password=hashed_password)  # Change to user.xxx
    
    db.add(new_user)
    db.commit()
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/login")
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Rest of your login code stays the same
    # Find user
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
        
    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Task endpoints
@app.post("/submit")
async def submit_images(files: List[UploadFile] = File(...), 
                        patientName: str = Form(None), 
                        date: str = Form(None),
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    print(f"Received patient name: {patientName}")
    print(f"Received date: {date}")
    if not files:
        raise HTTPException(400, "No files uploaded")

    task_id = str(uuid.uuid4())
    saved_paths = []
    for f in files:
        ext = os.path.splitext(f.filename)[1]
        uid = f"{uuid.uuid4()}{ext}"
        target = os.path.join(UPLOAD_DIR, uid)
        with open(target, "wb") as out:
            out.write(await f.read())
        saved_paths.append(target)

    # Create task in DB
    new_task = Task(
        id=task_id,
        user_id=current_user.id,
        status="PENDING",
        patient_name=patientName,
        date=date
    )
    db.add(new_task)
    db.commit()

    # Queue the task for processing with Celery
    process_malaria_images.delay(task_id, saved_paths)
    
    return {"task_id": task_id, "status": "PENDING"}

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    result = {}
    for task in tasks:
        result[task.id] = {
            "status": task.status,
            "patient_name": task.patient_name,
            "date": task.date,
            "created_at": task.created_at.isoformat()
        }
    return result

@app.get("/result/{task_id}")
async def get_result(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(404, "Task ID not found")
    
    return {
        "status": task.status,
        "result": json.loads(task.result) if task.result else None,
        "patient_name": task.patient_name,
        "date": task.date,
        "created_at": task.created_at.isoformat()
    }