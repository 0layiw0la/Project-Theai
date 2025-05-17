import os
import uuid
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from concurrent.futures import ProcessPoolExecutor

from ultralytics import YOLO
from functions import calculate_parasite_density

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ASEXUAL_MODEL_PATH = "./yolov9cbestsofar 130epocs no finetune.pt"
RBC_MODEL_PATH = "./rbc counter.pt"
STAGE_MODEL_PATH = "./yolov9 for segmenting parasit stages.pt"

asexual_model = YOLO(ASEXUAL_MODEL_PATH)
rbc_model = YOLO(RBC_MODEL_PATH)
stage_model = YOLO(STAGE_MODEL_PATH)

app = FastAPI(title="Parasite Density API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ProcessPoolExecutor(max_workers=max(1, os.cpu_count() - 1))

# Store task state
task_registry = {}

@app.post("/submit")
async def submit_images(files: List[UploadFile] = File(...)):
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

    task_registry[task_id] = {"status": "PENDING", "result": None}

    async def run_task():
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                executor,
                calculate_parasite_density,
                saved_paths,
                asexual_model,
                rbc_model,
                stage_model,
                500,
                5,
            )
            task_registry[task_id]["status"] = "SUCCESS"
            task_registry[task_id]["result"] = result
        except Exception as e:
            task_registry[task_id]["status"] = "FAILED"
            task_registry[task_id]["result"] = str(e)

    asyncio.create_task(run_task())

    return {"task_id": task_id, "status": "PENDING"}

@app.get("/tasks")
async def list_tasks():
    return task_registry

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(404, "Task ID not found")
    return task
