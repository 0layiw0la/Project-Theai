import os
import json
import torch
import psutil
from datetime import datetime, timedelta
from dotenv import load_dotenv
from celery_app import celery_app
from functions import calculate_parasite_density
from sqlalchemy.orm import Session
from ultralytics import YOLO
from database import SessionLocal, Task
from celery.exceptions import WorkerLostError

load_dotenv()

def configure_pytorch_threads():
    """Configure PyTorch to use optimal threads per worker"""
    try:
        # Get system resources
        total_cores = os.cpu_count() or 1
        total_memory_gb = psutil.virtual_memory().total / (1024**3)
        
        # Calculate optimal workers (same logic as celery_app.py)
        if total_memory_gb < 2:
            optimal_workers = 1
        elif 2 <= total_memory_gb < 4:
            optimal_workers = min(2, total_cores)
        elif 4 <= total_memory_gb < 8:
            optimal_workers = min(3, total_cores)
        else:
            optimal_workers = max(1, total_cores - 1)
        
        # Calculate threads per worker
        threads_per_worker = max(1, total_cores // optimal_workers)
        
        # Configure PyTorch threading
        torch.set_num_threads(threads_per_worker)
        torch.set_num_interop_threads(threads_per_worker)
        
        # Set environment variables for OpenMP/MKL
        os.environ['OMP_NUM_THREADS'] = str(threads_per_worker)
        os.environ['MKL_NUM_THREADS'] = str(threads_per_worker)
        os.environ['NUMEXPR_NUM_THREADS'] = str(threads_per_worker)
        
        print(f"Worker PID {os.getpid()}: {threads_per_worker} threads/worker ({optimal_workers} workers on {total_cores} cores)")
        return threads_per_worker
        
    except Exception as e:
        print(f"Thread configuration failed: {e}, using default")
        return total_cores

def log_memory_usage(task_id, stage=""):
    """Log current memory usage"""
    try:
        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024
        system_memory = psutil.virtual_memory()
        available_gb = system_memory.available / (1024**3)
        
        print(f"Task {task_id} {stage}: Worker memory: {memory_mb:.1f}MB, System available: {available_gb:.1f}GB")
        return memory_mb, available_gb
    except:
        return None, None

@celery_app.task(bind=True, autoretry_for=(WorkerLostError, ConnectionError, OSError, MemoryError))
def process_malaria_images(self, task_id: str, image_paths: list):
    
    def mark_task_failed(error_msg):
        try:
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "FAILED"
                task.result = json.dumps({
                    "error": error_msg, 
                    "retry_count": self.request.retries,
                    "worker_pid": os.getpid()
                })
                db.commit()
            db.close()
        except Exception as e:
            print(f"Failed to update task {task_id}: {e}")
    
    try:
        worker_pid = os.getpid()
        print(f"Worker PID {worker_pid} starting task {task_id} (attempt {self.request.retries + 1})")
        
        # Configure PyTorch threads for this worker
        threads_per_worker = configure_pytorch_threads()
        
        # Log initial memory
        log_memory_usage(task_id, "start")
        
        # Update task status to PROCESSING
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "PROCESSING"
            task.result = json.dumps({
                "status": "loading_models", 
                "attempt": self.request.retries + 1,
                "worker_pid": worker_pid,
                "threads_per_worker": threads_per_worker
            })
            db.commit()
        db.close()
        
        # Load models with memory monitoring
        print(f"Loading models for task {task_id}...")
        asexual_model = YOLO(os.getenv("ASEXUAL_MODEL_PATH"))
        log_memory_usage(task_id, "after asexual model")
        
        rbc_model = YOLO(os.getenv("RBC_MODEL_PATH"))  
        log_memory_usage(task_id, "after RBC model")
        
        stage_model = YOLO(os.getenv("STAGE_MODEL_PATH"))
        memory_mb, available_gb = log_memory_usage(task_id, "after all models")
        
        # Check if we have enough memory to proceed
        if available_gb and available_gb < 0.5:  # Less than 500MB available
            raise MemoryError(f"Insufficient system memory: {available_gb:.1f}GB available")
        
        print(f"Models loaded for task {task_id}")
        
        # Update progress
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.result = json.dumps({
                "status": "processing_images", 
                "attempt": self.request.retries + 1,
                "worker_pid": worker_pid,
                "worker_memory_mb": memory_mb,
                "threads_per_worker": threads_per_worker
            })
            db.commit()
        db.close()
        
        # Process images (long-running operation)
        print(f"Processing images for task {task_id}...")
        result = calculate_parasite_density(
            image_paths, asexual_model, rbc_model, stage_model, 500, 5
        )
        
        log_memory_usage(task_id, "after processing")
        print(f"Processing complete for task {task_id}")
        
        # Success - update database
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
        
        # Free memory
        del asexual_model, rbc_model, stage_model
        log_memory_usage(task_id, "after cleanup")
        
        return result
        
    except MemoryError as e:
        error_msg = f"Memory error: {str(e)}"
        print(f"Memory error in task {task_id}: {error_msg}")
        mark_task_failed(error_msg)
        raise  # Let Celery retry
        
    except WorkerLostError:
        print(f"Worker lost for task {task_id}")
        mark_task_failed("Worker was killed - likely due to resource limits")
        raise  # Let Celery handle the retry
        
    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        print(f"Task {task_id} failed (attempt {self.request.retries + 1}): {error_msg}")
        
        # Mark as failed if max retries exceeded
        if self.request.retries >= 1:
            mark_task_failed(error_msg)
            return {"error": error_msg}
        else:
            mark_task_failed(f"Retrying after error: {error_msg}")
            raise  # Trigger retry

@celery_app.task
def cleanup_orphaned_tasks():
    """Find and mark orphaned tasks as failed"""
    try:
        db = SessionLocal()
        
        # Find tasks that have been processing for over 30 minutes with no worker activity
        thirty_minutes_ago = datetime.utcnow() - timedelta(minutes=30)
        
        # Look for tasks that are stuck
        orphaned_tasks = db.query(Task).filter(
            Task.status == "PROCESSING",
            Task.created_at < thirty_minutes_ago
        ).all()
        
        cleanup_count = 0
        for task in orphaned_tasks:
            # Check if task is actually running by checking Celery
            from celery_app import celery_app
            active_tasks = celery_app.control.inspect().active()
            
            task_is_active = False
            if active_tasks:
                for worker, tasks in active_tasks.items():
                    for active_task in tasks:
                        if task.id in active_task.get('args', []):
                            task_is_active = True
                            break
            
            # If task is not active, mark as failed
            if not task_is_active:
                task.status = "FAILED"
                task.result = json.dumps({
                    "error": "Task orphaned - worker died or task lost",
                    "cleanup_time": datetime.utcnow().isoformat()
                })
                cleanup_count += 1
        
        if cleanup_count > 0:
            db.commit()
            print(f"Cleaned up {cleanup_count} orphaned tasks")
        
        db.close()
        return f"Cleaned up {cleanup_count} orphaned tasks"
        
    except Exception as e:
        print(f"Orphan cleanup failed: {e}")
        return f"Cleanup failed: {e}"