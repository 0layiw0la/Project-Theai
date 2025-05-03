import os
import uuid
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from typing import List
from concurrent.futures import ProcessPoolExecutor
import asyncio  # Import asyncio for task handling
from functions import calculate_parasite_density, stage_map  # import your existing function & map

# Configuration
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load models once at startup
ASEXUAL_MODEL_PATH = "./yolov9cbestsofar 130epocs no finetune.pt"
RBC_MODEL_PATH     = "./rbc counter.pt"
STAGE_MODEL_PATH   = "./yolov9 for segmenting parasit stages.pt"

asexual_model = YOLO(ASEXUAL_MODEL_PATH)
rbc_model     = YOLO(RBC_MODEL_PATH)
stage_model   = YOLO(STAGE_MODEL_PATH)
print('yes!')  # Debugging line to check if models are loaded
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

    # Submit to ProcessPoolExecutor and wait for the result
    task_id = str(uuid.uuid4())
    print(f"Task ID: {task_id}") # Debugging line to check task ID
    # Use asyncio to run the blocking task in an executor
    result = await asyncio.get_event_loop().run_in_executor(
        executor,
        calculate_parasite_density,
        saved_paths,  # image_list
        asexual_model,  # asexual_parasite_model
        rbc_model,  # rbc_model
        stage_model,  # stage_specific_model
        500,  # target_rbc_count
        5,  # repetitions
    )

    # Return result as soon as it's done
    return JSONResponse({"task_id": task_id, "status": "SUCCESS", "data": result})

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    # In this model, the user directly receives the result when the task is completed, so this can be omitted.
    # This can be kept for future modifications if needed.
    raise HTTPException(status_code=404, detail="Result query not supported directly.")
