/**
 * POST /api/process-cover
 * 
 * Proxies image to Python AI Image Processing Service.
 * Returns SSE stream with real-time progress updates.
 * 
 * Flow:
 * 1. Frontend posts image file
 * 2. This route forwards to Python service (localhost:8000/process)
 * 3. Python service streams SSE events back
 * 4. This route pipes the stream to the frontend
 * 
 * SSE Events from Python:
 *   data: {"step": "upload", "message": "Uploading..."}
 *   data: {"step": "bg_removal", "message": "Removing Background..."}
 *   ...
 *   data: {"step": "done", "message": "Done!", "url": "https://..."}
 */

export const runtime = "edge";

const PYTHON_SERVICE_URL = "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "File must be an image" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 10MB)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Forward to Python service
    const pyFormData = new FormData();
    pyFormData.append("file", file, file.name);

    const pyResponse = await fetch(`${PYTHON_SERVICE_URL}/process`, {
      method: "POST",
      body: pyFormData,
    });

    if (!pyResponse.ok) {
      const errText = await pyResponse.text();
      return new Response(
        JSON.stringify({ error: `Python service error: ${errText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pipe SSE stream from Python service to client
    if (!pyResponse.body) {
      return new Response(
        JSON.stringify({ error: "No response body from Python service" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(pyResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    // Python service not running?
    if (error?.cause?.code === "ECONNREFUSED") {
      return new Response(
        JSON.stringify({
          error: "Image processing service is not running. Start it with: cd image-service && python main.py",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** GET /api/process-cover — health check */
export async function GET() {
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        status: "offline",
        message: "Image processing service is not running",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
