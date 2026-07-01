# Image Processing Service — PustakaPOS

AI-powered book cover image processing pipeline. Runs as a separate
Python microservice alongside the Next.js app.

## Architecture

```
Next.js Frontend
  ↓ POST /api/process-cover (SSE proxy)
Python FastAPI Service (localhost:8000)
  ├── BiRefNet (via rembg)   → remove background
  ├── Pillow                 → crop, center, enhance, sharpen
  ├── Pillow                 → resize 1000×1500, WebP q85
  ├── boto3                  → upload to Cloudflare R2 (retry 3x)
  └── cleanup                → delete all temp files
```

## Setup

### 1. Install PyTorch with CUDA (GPU)

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 2. Install dependencies

```bash
cd image-service
pip install -r requirements.txt
```

### 3. Run the service

```bash
python main.py
```

Service starts on `http://localhost:8000`.

### 4. Verify

```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "python": "3.11.8",
  "torch": "2.x.x",
  "cuda": true,
  "gpu": "NVIDIA GeForce RTX ..."
}
```

## API

### POST /process

Upload an image and process it through the full pipeline.
Returns SSE (Server-Sent Events) stream with progress.

```bash
curl -X POST http://localhost:8000/process \
  -F "file=@cover.jpg"
```

**SSE Events:**
```
data: {"step": "upload", "message": "Uploading..."}
data: {"step": "bg_removal", "message": "Removing Background..."}
data: {"step": "cropping", "message": "Cropping..."}
data: {"step": "enhancing", "message": "Enhancing..."}
data: {"step": "resizing", "message": "Resizing to 1000x1500..."}
data: {"step": "compressing", "message": "Compressing to WebP..."}
data: {"step": "r2_upload", "message": "Uploading to Cloudflare R2..."}
data: {"step": "cleanup", "message": "Cleaning up..."}
data: {"step": "done", "message": "Done!", "url": "https://...", "size_kb": 150.3}
```

### GET /health

Health check — returns GPU/CUDA status.

## Pipeline Steps

| Step | Method | Description |
|------|--------|-------------|
| 1 | `remove_background()` | BiRefNet AI model removes background |
| 2 | `auto_crop_and_center()` | Crop to content bbox + center with margin |
| 3 | `auto_enhance()` | Brightness (if dark), contrast +15%, sharpen |
| 4 | `resize()` | Fit to 1000×1500 with white padding |
| 5 | `convert_to_webp()` | WebP quality 85, max 200KB |
| 6 | `uploadToR2()` | Upload to Cloudflare R2 (3x retry) |
| 7 | `cleanup()` | Delete all temp files |

## Swapping BiRefNet

To use a different background removal model, edit
`services/processor.py` → `remove_background()`:

```python
# Current: BiRefNet via rembg
self._rembg_session = new_session("birefnet-general")

# Alternative: U2Net (lighter, faster, lower quality)
self._rembg_session = new_session("u2net")

# Alternative: ISNet (good balance)
self._rembg_session = new_session("isnet-general-use")
```

The rest of the pipeline stays unchanged — that's the modular design.

## Performance

| Hardware | Time per image |
|----------|---------------|
| RTX GPU (CUDA) | 3-5 seconds |
| CPU only | 10-25 seconds |

First run downloads BiRefNet model (~900MB), cached afterward.

## Error Handling

- Any step failure → temp files cleaned, error returned
- R2 upload → 3 retries with exponential backoff
- No partial data saved to database on failure

## Logs

All operations logged to:
- Console (stdout)
- `image-service.log` file
