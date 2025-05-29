import os
import json
from dotenv import load_dotenv
from celery_app import celery_app
from functions import calculate_parasite_density
from sqlalchemy.orm import Session
from ultralytics import YOLO

# Load environment variables
load_dotenv()

# Database imports (you'll need to import these from main.py or create a separate db.py file)
from main import SessionLocal, Task

# Load models only in the worker process
asexual_model = YOLO(os.getenv("ASEXUAL_MODEL_PATH"))
rbc_model = YOLO(os.getenv("RBC_MODEL_PATH"))  
stage_model = YOLO(os.getenv("STAGE_MODEL_PATH"))

@celery_app.task
def process_malaria_images(task_id: str, image_paths: list):
    try:
        # Update task status
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "PROCESSING"
            db.commit()
        db.close()
        
        # Process images
        result = calculate_parasite_density(
            image_paths,
            asexual_model,
            rbc_model,
            stage_model,
            500,  # target_rbc_count
            5     # repetitions
        )
        
        # Update database with results
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "SUCCESS"
            task.result = json.dumps(result)
            db.commit()
        db.close()
        
        # Clean up uploaded files
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
        
        return result
        
    except Exception as e:
        # Update database with error
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "FAILED"
            task.result = json.dumps({"error": str(e)})
            db.commit()
        db.close()
        raise