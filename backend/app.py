import os
import uuid
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from ultralytics import YOLO
from typing import List
from concurrent.futures import ProcessPoolExecutor, as_completed
from your_module import calculate_parasite_density, stage_map  # import your existing function & map

# Configuration
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load models once at startup
ASEXUAL_MODEL_PATH = "/models/asexual.pt"
RBC_MODEL_PATH     = "/models/rbc.pt"
STAGE_MODEL_PATH   = "/models/stage.pt"

asexual_model = YOLO(ASEXUAL_MODEL_PATH)
rbc_model     = YOLO(RBC_MODEL_PATH)
stage_model   = YOLO(STAGE_MODEL_PATH)

# FastAPI app
app = FastAPI(title="Parasite Density API")

# Executor for background tasks (leave one CPU free)
executor = ProcessPoolExecutor(max_workers=max(1, os.cpu_count() - 1))

# In-memory store for futures: {task_id: Future}
tasks = {}

@app.post("/submit/")
async def submit_images(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "No files uploaded")

    saved_paths = []
    for f in files:
        ext = os.path.splitext(f.filename)[1]
        uid = f"{uuid.uuid4()}{ext}"
        target = os.path.join(UPLOAD_DIR, uid)
        with open(target, "wb") as out:
            out.write(await f.read())
        saved_paths.append(target)

    # Submit to ProcessPoolExecutor
    task_id = str(uuid.uuid4())
    future = executor.submit(
        calculate_parasite_density,
        image_list=saved_paths,
        asexual_parasite_model=asexual_model,
        rbc_model=rbc_model,
        stage_specific_model=stage_model,
        target_rbc_count=1000,
        repetitions=5,
        stage_class_map=stage_map
    )
    tasks[task_id] = future
    return JSONResponse({"task_id": task_id}, status_code=202)

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    future = tasks.get(task_id)
    if not future:
        raise HTTPException(404, "Task not found")
    if future.running():
        return {"status": "RUNNING"}
    if future.done():
        if future.exception():
            return {"status": "FAILED", "error": str(future.exception())}
        return {"status": "SUCCESS"}
    return {"status": "PENDING"}

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    future = tasks.get(task_id)
    if not future:
        raise HTTPException(404, "Task not found")
    if not future.done():
        return JSONResponse({"status": "PENDING"}, status_code=202)
    if future.exception():
        raise HTTPException(500, str(future.exception()))
    return {"status": "SUCCESS", "data": future.result()}