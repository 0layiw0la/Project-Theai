import os
import json
import torch
from datetime import datetime, timedelta
from dotenv import load_dotenv
from celery_app import celery_app
from functions import calculate_parasite_density
from sqlalchemy.orm import Session
from ultralytics import YOLO
from database import SessionLocal, Task
from celery.exceptions import WorkerLostError

load_dotenv()

def calculate_dynamic_timeout(task_id):
    """Calculate timeout based on queue position - fixed 2 workers"""
    try:
        from celery_app import celery_app
        
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active() or {}
        reserved_tasks = inspect.reserved() or {}
        
        # Count tasks ahead in queue
        queue_position = 0
        
        # Count active tasks
        for worker, tasks in active_tasks.items():
            queue_position += len(tasks)
        
        # Count reserved tasks until we find our task
        for worker, tasks in reserved_tasks.items():
            for task in tasks:
                if task_id in task.get('args', []):
                    break
                queue_position += 1
        
        # Calculate timeout: 30min base + 7min per task ahead (accounting for 2 workers)
        base_timeout = 30 * 60
        per_task_estimate = 7 * 60
        tasks_ahead = max(0, queue_position - 2)
        dynamic_timeout = base_timeout + (tasks_ahead * per_task_estimate)
        
        print(f"Task {task_id}: {tasks_ahead} tasks ahead, timeout: {dynamic_timeout/60:.1f} minutes")
        return dynamic_timeout
        
    except Exception as e:
        print(f"Failed to calculate timeout: {e}, using 30 minutes")
        return 30 * 60

def configure_pytorch_threads():
    """Configure PyTorch to use 2 threads per worker (4-core system)"""
    # FOR 4-CORE SYSTEM: Use 2 threads per worker (2 workers × 2 threads = 4 total)
    torch.set_num_threads(2)  # CHANGE TO 4 for 8-core system
    torch.set_num_interop_threads(2)  # CHANGE TO 4 for 8-core system
    os.environ['OMP_NUM_THREADS'] = '2'  # CHANGE TO '4' for 8-core system
    os.environ['MKL_NUM_THREADS'] = '2'  # CHANGE TO '4' for 8-core system
    print(f"Worker PID {os.getpid()}: 2 threads configured (4-core system)")  # UPDATE MESSAGE for 8-core

@celery_app.task(bind=True, autoretry_for=(WorkerLostError, ConnectionError, OSError))
def process_malaria_images(self, task_id: str, image_paths: list):
    
    dynamic_timeout = calculate_dynamic_timeout(task_id)
    start_time = datetime.utcnow()
    
    def mark_task_failed(error_msg):
        try:
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "FAILED"
                task.result = json.dumps({"error": error_msg})
                db.commit()
            db.close()
        except Exception as e:
            print(f"Failed to update task {task_id}: {e}")
    
    def check_timeout():
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        if elapsed > dynamic_timeout:
            raise TimeoutError(f"Task exceeded {dynamic_timeout/60:.1f} minute timeout")
    
    try:
        print(f"Starting task {task_id} with {dynamic_timeout/60:.1f} minute timeout")
        
        # Configure threads
        configure_pytorch_threads()
        
        # Update status to PROCESSING
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "PROCESSING"
            task.result = json.dumps({
                "status": "loading_models",
                "timeout_minutes": dynamic_timeout / 60,
                "estimated_completion": (datetime.utcnow() + timedelta(seconds=dynamic_timeout)).isoformat()
            })
            db.commit()
        db.close()
        
        # Load models
        print(f"Loading models for task {task_id}...")
        check_timeout()
        
        asexual_model = YOLO(os.getenv("ASEXUAL_MODEL_PATH"))
        check_timeout()
        
        rbc_model = YOLO(os.getenv("RBC_MODEL_PATH"))
        check_timeout()
        
        stage_model = YOLO(os.getenv("STAGE_MODEL_PATH"))
        check_timeout()
        
        # Update progress
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.result = json.dumps({
                "status": "processing_images",
                "timeout_minutes": dynamic_timeout / 60
            })
            db.commit()
        db.close()
        
        # Process images
        print(f"Processing images for task {task_id}...")
        check_timeout()
        
        result = calculate_parasite_density(
            image_paths, asexual_model, rbc_model, stage_model, 500, 5
        )
        
        print(f"Processing complete for task {task_id}")
        
        # Success
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "SUCCESS"
            task.result = json.dumps(result)
            db.commit()
        db.close()
        
        # Cleanup files
        for path in image_paths:
            if os.path.exists(path):
                os.remove(path)
        
        return result
        
    except TimeoutError as e:
        print(f"Timeout for task {task_id}: {e}")
        mark_task_failed(str(e))
        return {"error": str(e)}
        
    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        print(f"Task {task_id} failed: {error_msg}")
        
        if self.request.retries >= 1:
            mark_task_failed(error_msg)
            return {"error": error_msg}
        else:
            mark_task_failed(f"Retrying after error: {error_msg}")
            raise

@celery_app.task
def cleanup_orphaned_tasks():
    """Simple cleanup for stuck tasks only (24hr cleanup is automatic)"""
    try:
        db = SessionLocal()
        now = datetime.utcnow()
        
        # Only look for stuck/orphaned tasks, not old ones
        processing_tasks = db.query(Task).filter(Task.status == "PROCESSING").all()
        cleanup_count = 0
        
        for task in processing_tasks:
            try:
                if task.result:
                    task_data = json.loads(task.result)
                    estimated_completion = task_data.get('estimated_completion')
                    
                    if estimated_completion:
                        completion_time = datetime.fromisoformat(estimated_completion.replace('Z', '+00:00'))
                        if now > completion_time:
                            task.status = "FAILED"
                            task.result = json.dumps({
                                "error": "Task exceeded timeout",
                                "cleanup_time": now.isoformat()
                            })
                            cleanup_count += 1
                    else:
                        # Only cleanup tasks stuck for more than 2 hours
                        if (now - task.created_at).total_seconds() > 2 * 3600:
                            task.status = "FAILED"
                            task.result = json.dumps({
                                "error": "Task stuck - no timeout data",
                                "cleanup_time": now.isoformat()
                            })
                            cleanup_count += 1
            except:
                # Only cleanup very old stuck tasks
                if (now - task.created_at).total_seconds() > 2 * 3600:
                    task.status = "FAILED"
                    task.result = json.dumps({
                        "error": "Task cleanup - corrupt data",
                        "cleanup_time": now.isoformat()
                    })
                    cleanup_count += 1
        
        if cleanup_count > 0:
            db.commit()
            print(f"Cleaned up {cleanup_count} stuck tasks")
        
        db.close()
        return f"Cleaned up {cleanup_count} stuck tasks"
        
    except Exception as e:
        print(f"Cleanup failed: {e}")
        return f"Cleanup failed: {e}"   