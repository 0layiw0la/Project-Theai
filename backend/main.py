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
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from ultralytics import YOLO
from functions import calculate_parasite_density
from gcp_storage import gcp_storage
from celery_app import celery_app
from tasks import process_malaria_images
from database import SessionLocal, User, Task, get_db
from llama_service import llama_service


# Auth
load_dotenv()  
UPLOAD_DIR = os.getenv("UPLOAD_DIR","uploads")
SECRET_KEY = os.getenv("JWT_SECRET_KEY")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


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

@app.get("/validate-token")
async def validate_token(current_user: User = Depends(get_current_user)):
    """Validate current token and return user info"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "valid": True
    }

# Task endpoints
@app.post("/submit")
async def submit_images(files: List[UploadFile] = File(...), 
                        patientName: str = Form(None), 
                        date: str = Form(None),
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    if not files:
        raise HTTPException(400, "No files uploaded")

    task_id = str(uuid.uuid4())
    
    try:
        # Upload to GCP and get URLs
        image_urls = await gcp_storage.upload_images(files, task_id)
        # Create task with URLs
        new_task = Task(
            id=task_id,
            user_id=current_user.id,
            status="PROCESSING",
            patient_name=patientName,
            date=date,
            image_urls=json.dumps(image_urls)  # Store URLs as JSON
        )
        db.add(new_task)
        db.commit()

        # Queue task with URLs instead of file paths
        process_malaria_images.delay(task_id, image_urls)
        
        return {"task_id": task_id, "status": "PENDING", "images_uploaded": len(image_urls)}
        
    except Exception as e:
        await gcp_storage.cleanup_task_images(task_id)
        raise HTTPException(500, f"Upload failed: {str(e)}")

@app.get("/tasks")
async def list_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all tasks for current user with automatic cleanup"""
    try:
        # Step 1: Cleanup stuck/orphaned tasks (timeout-based)
        from tasks import cleanup_orphaned_tasks
        cleanup_result = cleanup_orphaned_tasks()
        
        # Step 2: Delete tasks older than 24 hours
        forty_two_hours_ago = datetime.utcnow() - timedelta(hours=42)
        
        old_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.created_at < forty_two_hours_ago
        ).all()
        
        old_task_count = len(old_tasks)
        if old_task_count > 0:
            for task in old_tasks:
                db.delete(task)
            db.commit()

        
        # Step 3: Get remaining tasks
        tasks = db.query(Task).filter(Task.user_id == current_user.id).order_by(Task.created_at.desc()).all()
        
        task_dict = {}
        for task in tasks:
            try:
                result = json.loads(task.result) if task.result else {}
            except:
                result = {"error": "Invalid result data"}
            
            task_dict[task.id] = {
                "status": task.status,
                "created_at": task.created_at.isoformat(),
                "patient_name": task.patient_name,
                "date": task.date,
                "result": result
            }
        
        return task_dict
        
    except Exception as e:
        print(f"Error in list_tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")


@app.delete("/task/{task_id}")
async def delete_task(
    task_id: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Delete a task and cleanup associated resources"""
    try:
        # Find the task
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
        if not task:
            raise HTTPException(404, "Task not found")
        
        # Cleanup GCP images if they exist
        if task.image_urls:
            try:
                await gcp_storage.cleanup_task_images(task_id)
                print(f"✅ Cleaned up GCP images for task {task_id}")
            except Exception as gcp_error:
                print(f"⚠️ Failed to cleanup GCP images: {gcp_error}")
                # Don't fail deletion if cleanup fails
        
        # Delete from database
        db.delete(task)
        db.commit()
        
        return {"message": f"Task {task_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to delete task: {str(e)}")
    
    
@app.get("/result/{task_id}")
async def get_result(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(404, "Task ID not found")
    
    # ✅ NEW: Auto-generate report and cleanup on first result access
    if task.status == "SUCCESS" and task.result:
        
        # Generate AI report if not already done
        if not task.ai_report:
            try:
                print(f"Generating AI report for task {task_id} on result access...")
                ai_report = await llama_service.generate_comprehensive_report(task_id, current_user.id, db)
                
                # Save report to database
                task.ai_report = ai_report
                db.commit()
                print(f"✅ AI report generated and cached for task {task_id}")
                
            except Exception as e:
                print(f"⚠️ Failed to generate AI report: {e}")
                # Set a fallback message
                task.ai_report = "AI report generation failed. Please use the chat feature for detailed analysis."
                db.commit()
        
        # ✅ NEW: Delete GCP images on first successful result access
        # Only delete if images haven't been cleaned up yet (check if image_urls exist)
        if task.image_urls:
            try:
                print(f"Cleaning up GCP images for task {task_id}...")
                await gcp_storage.cleanup_task_images(task_id)
                
                # Clear image_urls to indicate cleanup is done
                task.image_urls = None
                db.commit()
                print(f"✅ GCP images cleaned up for task {task_id}")
                
            except Exception as gcp_error:
                print(f"⚠️ Failed to cleanup GCP images for task {task_id}: {gcp_error}")
                # Don't fail the request if cleanup fails
    
    return {
        "status": task.status,
        "result": json.loads(task.result) if task.result else None,
        "patient_name": task.patient_name,
        "date": task.date,
        "created_at": task.created_at.isoformat(),
        "ai_report": task.ai_report  # Return cached or newly generated report
    }

@app.post("/retry/{task_id}")
async def retry_task(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retry a failed task using stored image URLs"""
    try:
        # Find the failed task
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
        if not task:
            raise HTTPException(404, "Task not found")
        
        if task.status not in ["FAILED"]:
            raise HTTPException(400, f"Cannot retry task with status: {task.status}")
        
        if not task.image_urls:
            raise HTTPException(400, "No image URLs found for this task")
        
        # Parse stored URLs
        image_urls = json.loads(task.image_urls)
        
        # Reset task status to PENDING
        task.status = "PENDING"
        task.result = json.dumps({"status": "retrying"})
        db.commit()
        
        # Queue the task again with same URLs
        from tasks import process_malaria_images
        process_malaria_images.delay(task_id, image_urls)
        
        
        return {
            "task_id": task_id, 
            "status": "PENDING", 
            "message": "Task retry initiated",
            "images_count": len(image_urls)
        }
        
    except Exception as e:
        raise HTTPException(500, f"Retry failed: {str(e)}")
    
@app.post("/chat/{task_id}")
async def chat_with_task(
    task_id: str, 
    message: dict,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        user_message = message.get("message", "").strip()
        if not user_message:
            raise HTTPException(400, "Empty message")
        
        response = await llama_service.chat(task_id, current_user.id, user_message, db)
        return {"response": response}
        
    except Exception as e:
        raise HTTPException(500, str(e))
    
@app.get("/chat/{task_id}/history")
async def get_chat_history(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
        if not task:
            raise HTTPException(404, "Task not found")
        
        messages = []
        if task.last_chat_history:
            history = json.loads(task.last_chat_history)
            for qa in history:
                messages.extend([
                    {"role": "user", "content": qa["user"]},
                    {"role": "assistant", "content": qa["assistant"]}
                ])
        
        return {"messages": messages}
        
    except Exception as e:
        raise HTTPException(500, str(e))