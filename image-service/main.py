"""
Image Processing Service for PustakaPOS
=======================================
FastAPI microservice yang menjalankan AI image processing pipeline
untuk cover buku: remove background (BiRefNet), auto-crop, enhance,
resize, convert ke WebP, upload ke Cloudflare R2.

Author: Zaein (Shino)
Created: 2026-06-30
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import logging
import sys
import os
import tempfile
import uuid
import time
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("image-service.log"),
    ],
)
logger = logging.getLogger("image-service")

app = FastAPI(
    title="PustakaPOS Image Processing Service",
    description="AI-powered cover book image processing pipeline",
    version="1.0.0",
)

# CORS — allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# R2 Configuration (Cloudflare R2 — S3-compatible)
R2_CONFIG = {
    "account_id": "5f3c24963db02b0b6a73df072d2675e2",
    "access_key_id": "5612ca8b1d07639a96a0b8d49a47349d",
    "secret_access_key": "aaa17675146e84798a748d641e663669a05f762639bce4fe3c90ab563843bdab",
    "bucket": "poster-buku",
    "endpoint": "https://5f3c24963db02b0b6a73df072d2675e2.r2.cloudflarestorage.com",
    "public_base": "https://pub-5f3c24963db02b0b6a73df072d2675e2.r2.dev/poster-buku",
}


@app.post("/process")
async def process_image(file: UploadFile = File(...)):
    """
    Process a book cover image through the full AI pipeline.
    
    Returns SSE (Server-Sent Events) stream with progress updates.
    Final event contains the R2 URL of the processed image.
    
    Pipeline:
    1. Remove background (BiRefNet via rembg)
    2. Auto-crop & center
    3. Auto-enhance (brightness, contrast, sharpen)
    4. Resize to 1000x1500
    5. Convert to WebP (quality 85)
    6. Upload to Cloudflare R2
    7. Cleanup temp files
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())[:8]
    logger.info(f"[{job_id}] Started processing: {file.filename} ({file.content_type})")
    
    async def event_stream():
        """SSE event generator — streams progress to client."""
        temp_files = []  # Track temp files for cleanup
        start_time = time.time()
        
        def send_event(step: str, message: str, data: dict = None):
            """Helper: format SSE event."""
            payload = {"step": step, "message": message, "job_id": job_id}
            if data:
                payload.update(data)
            return f"data: {json.dumps(payload)}\n\n"
        
        try:
            # Step 1: Save uploaded file to temp
            yield send_event("upload", "Uploading...")
            
            suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
            input_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_input{suffix}")
            output_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_processed.webp")
            temp_files.extend([input_path, output_path])
            
            content = await file.read()
            with open(input_path, "wb") as f:
                f.write(content)
            
            input_size_kb = len(content) / 1024
            logger.info(f"[{job_id}] Input saved: {input_path} ({input_size_kb:.1f} KB)")
            yield send_event("upload", "Uploading...", {"size_kb": round(input_size_kb, 1)})
            
            # Step 2: Remove background (BiRefNet)
            yield send_event("bg_removal", "Removing Background...")
            
            from services.processor import ImageProcessingService
            processor = ImageProcessingService()
            
            no_bg_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_nobg.png")
            temp_files.append(no_bg_path)
            
            no_bg_path = processor.remove_background(input_path, no_bg_path)
            logger.info(f"[{job_id}] Background removed: {no_bg_path}")
            yield send_event("bg_removal", "Background removed!")
            
            # Step 3: Auto-crop & center
            yield send_event("cropping", "Cropping...")
            cropped_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_cropped.png")
            temp_files.append(cropped_path)
            
            cropped_path = processor.auto_crop_and_center(no_bg_path, cropped_path)
            logger.info(f"[{job_id}] Cropped & centered: {cropped_path}")
            yield send_event("cropping", "Cropped & centered!")
            
            # Step 4: Auto-enhance (brightness, contrast, sharpen)
            yield send_event("enhancing", "Enhancing...")
            enhanced_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_enhanced.png")
            temp_files.append(enhanced_path)
            
            enhanced_path = processor.auto_enhance(cropped_path, enhanced_path)
            logger.info(f"[{job_id}] Enhanced: {enhanced_path}")
            yield send_event("enhancing", "Enhanced!")
            
            # Step 5: Resize to 1000x1500
            yield send_event("resizing", "Resizing to 1000x1500...")
            resized_path = os.path.join(tempfile.gettempdir(), f"cover_{job_id}_resized.png")
            temp_files.append(resized_path)
            
            resized_path = processor.resize(enhanced_path, resized_path, target_w=1000, target_h=1500)
            logger.info(f"[{job_id}] Resized: {resized_path}")
            
            # Step 6: Convert to WebP
            yield send_event("compressing", "Compressing to WebP...")
            processor.convert_to_webp(resized_path, output_path, quality=85)
            
            output_size_kb = os.path.getsize(output_path) / 1024
            logger.info(f"[{job_id}] WebP created: {output_path} ({output_size_kb:.1f} KB)")
            yield send_event("compressing", "Compressed!", {"size_kb": round(output_size_kb, 1)})
            
            # Step 7: Upload to R2
            yield send_event("r2_upload", "Uploading to Cloudflare R2...")
            from services.r2_uploader import R2Uploader
            uploader = R2Uploader(R2_CONFIG)
            
            r2_key = f"covers/{job_id}_{int(time.time())}.webp"
            r2_url = uploader.upload_with_retry(output_path, r2_key, max_retries=3)
            logger.info(f"[{job_id}] Uploaded to R2: {r2_url}")
            
            # Simpan salinan lokal agar bisa dikirim via Telegram
            local_cache_dir = r"D:\.hermes\profiles\agent1-shino\image_cache"
            os.makedirs(local_cache_dir, exist_ok=True)
            local_cache = os.path.join(local_cache_dir, f"processed_{job_id}.webp")
            import shutil
            shutil.copy2(output_path, local_cache)
            logger.info(f"[{job_id}] Local cache saved: {local_cache}")
            
            yield send_event("r2_upload", "Uploaded to R2!", {"url": r2_url})
            
            # Step 8: Cleanup temp files
            yield send_event("cleanup", "Cleaning up...")
            from services.cleanup import cleanup_temp_files
            cleanup_temp_files(temp_files)
            logger.info(f"[{job_id}] Temp files cleaned: {len(temp_files)} files")
            
            # Done!
            elapsed = time.time() - start_time
            yield send_event("done", "Done!", {
                "url": r2_url,
                "size_kb": round(output_size_kb, 1),
                "elapsed_seconds": round(elapsed, 2),
            })
            logger.info(f"[{job_id}] Completed in {elapsed:.2f}s")
            
        except Exception as e:
            logger.error(f"[{job_id}] Error: {str(e)}", exc_info=True)
            
            # Cleanup on error
            from services.cleanup import cleanup_temp_files
            cleanup_temp_files(temp_files)
            
            yield send_event("error", f"Error: {str(e)}")
        
        finally:
            # Ensure cleanup
            from services.cleanup import cleanup_temp_files
            cleanup_temp_files(temp_files)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    """Health check endpoint."""
    import onnxruntime as ort
    return {
        "status": "ok",
        "python": sys.version.split()[0],
        "providers": ort.get_available_providers(),
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
