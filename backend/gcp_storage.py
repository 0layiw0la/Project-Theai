import os
import json
import uuid
import tempfile
import aiohttp
import asyncio
from typing import List
from datetime import datetime, timedelta
from google.cloud import storage
from fastapi import UploadFile

class GCPStorageService:
    def __init__(self):
        try:
            self.client = storage.Client()
            self.bucket_name = os.getenv("GCP_BUCKET_NAME")
            self.bucket = self.client.bucket(self.bucket_name)
            self.use_local_storage = False
        except Exception as e:
            print(f"⚠️  Failed to initialize GCP Storage: {e}")
            print("⚠️  Falling back to local storage")
            self.use_local_storage = True
    
    async def upload_images(self, files: List[UploadFile], task_id: str) -> List[str]:
        """Upload images and return signed URLs (or local paths as fallback)"""
        if self.use_local_storage:
            return await self._upload_local(files, task_id)
        
        urls = []
        for i, file in enumerate(files):
            try:
                file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
                unique_filename = f"tasks/{task_id}/image_{i}_{uuid.uuid4().hex[:8]}{file_extension}"
                
                blob = self.bucket.blob(unique_filename)
                file_content = await file.read()
                
                # Upload to GCP (private, not public)
                blob.upload_from_string(
                    file_content,
                    content_type=file.content_type or 'image/jpeg'
                )
                
                # Generate signed URL (valid for 24 hours)
                signed_url = blob.generate_signed_url(
                    version="v4",
                    expiration=datetime.utcnow() + timedelta(hours=24),
                    method="GET"
                )
                
                urls.append(signed_url)
                await file.seek(0)
                
                
            except Exception as e:
                print(f"Failed to upload {file.filename}: {e}")
                #await self.cleanup_task_images(task_id)
                raise Exception(f"Upload failed: {str(e)}")
        
        return urls
    
    async def download_image(self, url: str) -> bytes:
        """Download image from signed URL or local path"""
        try:
            if url.startswith('http'):
                # It's a signed URL - download via HTTP
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        if response.status == 200:
                            return await response.read()
                        else:
                            raise Exception(f"Failed to download: HTTP {response.status}")
            else:
                # It's a local file path
                with open(url, 'rb') as f:
                    return f.read()
        except Exception as e:
            print(f"Failed to download image from {url}: {e}")
            raise
    
    async def _upload_local(self, files: List[UploadFile], task_id: str) -> List[str]:
        """Fallback: Save to local storage and return file paths"""
        upload_dir = f"uploads/{task_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_paths = []
        for i, file in enumerate(files):
            try:
                file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
                filename = f"image_{i}_{uuid.uuid4().hex[:8]}{file_extension}"
                file_path = os.path.join(upload_dir, filename)
                
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                
                file_paths.append(file_path)
                await file.seek(0)
                
                
            except Exception as e:
                print(f"Failed to save {file.filename}: {e}")
                raise Exception(f"Local save failed: {str(e)}")
        
        return file_paths
    
    async def cleanup_task_images(self, task_id: str):
        """Clean up images (GCP or local)"""
        try:
            if self.use_local_storage:
                import shutil
                upload_dir = f"uploads/{task_id}"
                if os.path.exists(upload_dir):
                    shutil.rmtree(upload_dir)
            else:
                # GCP cleanup
                blobs = self.bucket.list_blobs(prefix=f"tasks/{task_id}/")
                for blob in blobs:
                    blob.delete()
        except Exception as e:
            print(f"Failed to cleanup images for task {task_id}: {e}")
    
    async def cleanup_old_images(self, days_old: int = 7):
        """Clean up images older than specified days"""
        try:
            if self.use_local_storage:
                # Local cleanup
                cutoff_date = datetime.utcnow() - timedelta(days=days_old)
                upload_base = "uploads"
                if os.path.exists(upload_base):
                    for task_dir in os.listdir(upload_base):
                        task_path = os.path.join(upload_base, task_dir)
                        if os.path.isdir(task_path):
                            # Check directory creation time
                            dir_time = datetime.fromtimestamp(os.path.getctime(task_path))
                            if dir_time < cutoff_date:
                                import shutil
                                shutil.rmtree(task_path)
            else:
                # GCP cleanup
                cutoff_date = datetime.utcnow() - timedelta(days=days_old)
                blobs = self.bucket.list_blobs(prefix="tasks/")
                
                for blob in blobs:
                    if blob.time_created < cutoff_date.replace(tzinfo=blob.time_created.tzinfo):
                        blob.delete()
                
        except Exception as e:
            print(f"Failed to cleanup old images: {e}")

# Global instance
gcp_storage = GCPStorageService()