import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

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
    # Fixed concurrency
    worker_concurrency=2,  # 2 workers
    # Auto-retry settings
    task_autoretry_for=(Exception,),
    task_retry_kwargs={
        'max_retries': 3,
        'countdown': 60,
    }
)

# Empty beat schedule
celery_app.conf.beat_schedule = {}
