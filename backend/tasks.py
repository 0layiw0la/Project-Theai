import os
import json
import torch
import asyncio
import requests
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from celery_app import celery_app
from functions import calculate_parasite_density
from sqlalchemy.orm import Session
from ultralytics import YOLO
from database import SessionLocal, Task
from celery.exceptions import WorkerLostError
from gcp_storage import gcp_storage 

load_dotenv()

def configure_8vcpu_threads():
    """Configure for 8-vCPU processing"""
    torch.set_num_threads(8)
    torch.set_num_interop_threads(8)
    os.environ['OMP_NUM_THREADS'] = '8'
    os.environ['MKL_NUM_THREADS'] = '8'

@celery_app.task(bind=True, autoretry_for=(WorkerLostError, ConnectionError, OSError))
def process_malaria_images(self, task_id: str, image_urls: list):
    
    configure_8vcpu_threads()
    
    temp_files = []
    
    db = SessionLocal()
    queued_tasks = db.query(Task).filter(Task.status == "PROCESSING").count()
    db.close()
    
    timeout_minutes = 15 + (queued_tasks * 1)
    start_time = time.time()
    timeout_seconds = timeout_minutes * 60
    
    print(f"Task {task_id} timeout set to {timeout_minutes} minutes ({queued_tasks} queued tasks)")
    print(f"Using 8-vCPU single-task processing mode")
    
    try:        
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "PROCESSING"
            task.result = json.dumps({"status": "processing_started", "mode": "8-vCPU_single_task"})
            db.commit()
        db.close()
        
        def check_timeout():
            if time.time() - start_time > timeout_seconds:
                raise TimeoutError(f"Task exceeded {timeout_minutes} minute timeout")
        
        check_timeout()
        
        for i, url in enumerate(image_urls):
            check_timeout()
            
            if url.startswith('http'):
                response = requests.get(url)
                temp_file = f"/tmp/task_{task_id}_img_{i}.jpg"
                with open(temp_file, 'wb') as f:
                    f.write(response.content)
                temp_files.append(temp_file)
            else:
                temp_files.append(url)
        
        check_timeout()
        
        asexual_model = YOLO(os.getenv("ASEXUAL_MODEL_PATH"))
        rbc_model = YOLO(os.getenv("RBC_MODEL_PATH"))
        stage_model = YOLO(os.getenv("STAGE_MODEL_PATH"))
        
        check_timeout()
        
        result = calculate_parasite_density(
            temp_files, asexual_model, rbc_model, stage_model, 1000, 5
        )
        
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "SUCCESS"
            task.result = json.dumps(result)
            db.commit()
        db.close()
        
        for file_path in temp_files:
            if file_path.startswith('/tmp/'):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        elapsed_time = (time.time() - start_time) / 60
        print(f"✅ Task {task_id} completed in {elapsed_time:.1f} minutes using 8-vCPU processing")
        return result
        
    except TimeoutError as timeout_error:
        error_msg = str(timeout_error)
        print(f"⏱️ Task {task_id} timed out: {error_msg}")
        
        for file_path in temp_files:
            if file_path.startswith('/tmp/'):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        try:
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "FAILED"
                task.result = json.dumps({
                    "error": error_msg,
                    "timeout": True,
                    "elapsed_minutes": (time.time() - start_time) / 60,
                    "mode": "8-vCPU_single_task"
                })
                db.commit()
            db.close()
        except Exception as db_error:
            print(f"Failed to update timeout status: {db_error}")
        
        return {"error": error_msg}
        
    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        elapsed_time = (time.time() - start_time) / 60
        print(f"Task {task_id} failed after {elapsed_time:.1f} minutes: {error_msg}")
        
        for file_path in temp_files:
            if file_path.startswith('/tmp/'):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        try:
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "FAILED"
                task.result = json.dumps({
                    "error": error_msg,
                    "elapsed_minutes": elapsed_time,
                    "mode": "8-vCPU_single_task"
                })
                db.commit()
            db.close()
        except Exception as db_error:
            print(f"Failed to update task status: {db_error}")
        
        return {"error": error_msg}

@celery_app.task
def cleanup_orphaned_tasks():
    """Clean up stuck tasks"""
    try:
        db = SessionLocal()
        now = datetime.utcnow()
        
        stuck_tasks = db.query(Task).filter(
            Task.status == "PROCESSING",
            Task.created_at < now - timedelta(hours=1)
        ).all()
        
        cleanup_count = 0
        for task in stuck_tasks:
            task.status = "FAILED"
            task.result = json.dumps({
                "error": "Task exceeded timeout",
                "cleanup_time": now.isoformat()
            })
            cleanup_count += 1
        
        if cleanup_count > 0:
            db.commit()
        
        db.close()
        return f"Cleaned up {cleanup_count} stuck tasks"
        
    except Exception as e:
        return f"Cleanup failed: {e}"