import os
import psutil
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

def get_safe_worker_count():
    """Calculate safe worker count based on available RAM"""
    try:
        # Get total system memory in GB
        memory_gb = psutil.virtual_memory().total / (1024**3)
        cpu_count = os.cpu_count() or 1
        
        print(f"System RAM: {memory_gb:.1f}GB, CPU cores: {cpu_count}")
        
        # resource allocation rules
        if memory_gb < 2:
            workers = 1
        elif 2 <= memory_gb < 4:
            workers = min(2, cpu_count)
        elif 4 <= memory_gb < 8:
            workers = min(3, cpu_count)
        else: 
            workers = max(1, cpu_count - 1)  # Always leave 1 CPU free
        
        print(f"Calculated optimal workers: {workers}")
        # Ensure minimum of 1 worker
        return max(1, workers)
        
    except Exception as e:
        print(f"Error detecting resources: {e}, defaulting to 1 worker")
        return 1

# Get optimal worker count
OPTIMAL_WORKERS = get_safe_worker_count()

celery_app = Celery(
    "malaria_detection",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
    include=["tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    # Resource management
    task_track_started=True,
    task_reject_on_worker_lost=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Only prefetch 1 task per worker
    worker_max_tasks_per_child=3,  # Restart worker after 3 tasks (prevents memory leaks)
    # Dynamic concurrency
    worker_concurrency=OPTIMAL_WORKERS,
    # Auto-retry settings
    task_autoretry_for=(Exception,),
    task_retry_kwargs={
        'max_retries': 1,
        'countdown': 60,
    }
)

# Empty beat schedule
celery_app.conf.beat_schedule = {}

print(f"Celery configured with {OPTIMAL_WORKERS} workers")