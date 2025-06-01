import os
import json
import torch
import asyncio
import requests
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

def configure_pytorch_threads():
    """Configure PyTorch to use 2 threads per worker"""
    torch.set_num_threads(2)
    torch.set_num_interop_threads(2)
    os.environ['OMP_NUM_THREADS'] = '2'
    os.environ['MKL_NUM_THREADS'] = '2'

@celery_app.task(bind=True, autoretry_for=(WorkerLostError, ConnectionError, OSError))
def process_malaria_images(self, task_id: str, image_urls: list):
    
    temp_files = []
    
    try:        
        # Configure threads
        configure_pytorch_threads()
        
        # Update status to PROCESSING
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "PROCESSING"
            task.result = json.dumps({"status": "processing_started"})
            db.commit()
        db.close()
        
        # Download images from URLs to temp files
        for i, url in enumerate(image_urls):
            if url.startswith('http'):
                # Download from GCP URL
                response = requests.get(url)
                temp_file = f"/tmp/task_{task_id}_img_{i}.jpg"
                with open(temp_file, 'wb') as f:
                    f.write(response.content)
                temp_files.append(temp_file)
            else:
                # Local file path
                temp_files.append(url)
        
        # Load models
        asexual_model = YOLO(os.getenv("ASEXUAL_MODEL_PATH"))
        rbc_model = YOLO(os.getenv("RBC_MODEL_PATH"))
        stage_model = YOLO(os.getenv("STAGE_MODEL_PATH"))
        
        # Process images
        result = calculate_parasite_density(
            temp_files, asexual_model, rbc_model, stage_model, 500, 5
        )
        
        
        # Update to SUCCESS
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "SUCCESS"
            task.result = json.dumps(result)
            db.commit()
        db.close()
        
        # Clean up temp files
        for file_path in temp_files:
            if file_path.startswith('/tmp/'):
                try:
                    os.remove(file_path)
                except:
                    pass
        # Delete images from GCP on success
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(gcp_storage.cleanup_task_images(task_id))
            finally:
                loop.close()
        except Exception as gcp_error:
            print(f"⚠️  Failed to cleanup GCP images for task {task_id}: {gcp_error}")
        
        return result
        
    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        print(f"Task {task_id} failed: {error_msg}")
        
        # Clean up temp files
        for file_path in temp_files:
            if file_path.startswith('/tmp/'):
                try:
                    os.remove(file_path)
                except:
                    pass
        
        # Mark as failed
        try:
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "FAILED"
                task.result = json.dumps({"error": error_msg})
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
        
        # Find tasks stuck in PROCESSING for more than 2 hours
        stuck_tasks = db.query(Task).filter(
            Task.status == "PROCESSING",
            Task.created_at < now - timedelta(hours=2)
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