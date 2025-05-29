from celery_app import celery_app
from functions import calculate_parasite_density
from sqlalchemy.orm import Session
from main import SessionLocal, Task
import json
from ultralytics import YOLO

# Load models
asexual_model = YOLO("./yolov9cbestsofar 130epocs no finetune.pt")
rbc_model = YOLO("./rbc counter.pt")
stage_model = YOLO("./yolov9 for segmenting parasit stages.pt")

@celery_app.task
def process_malaria_images(task_id: str, image_paths: list):
    try:
        # Process images
        result = calculate_parasite_density(
            image_paths,
            asexual_model,
            rbc_model,
            stage_model,
            500,
            5
        )
        
        # Update database
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "SUCCESS"
            task.result = json.dumps(result)
            db.commit()
        db.close()
        
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