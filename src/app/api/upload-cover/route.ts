// POST /api/upload-cover
// Supports 3 input modes:
//   1. JSON: { imageUrl: string } — download from URL
//   2. FormData: { file: File } — direct upload (camera / file picker)
//   3. JSON: { base64: string, filename?: string } — clipboard paste
// Uploads to Supabase Storage (bucket: covers)
// Edge-compatible (no Node.js deps)
export const runtime = "edge";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "covers";

async function uploadToSupabase(
  imageData: ArrayBuffer,
  contentType: string,
  filename?: string
): Promise<{ url: string; key: string } | { error: string; detail?: string }> {
  if (!SUPA_URL || !SUPA_SERVICE_KEY) {
    return { error: "Supabase Storage not configured" };
  }

  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
    ? ".webp"
    : contentType.includes("gif")
    ? ".gif"
    : ".jpg";

  const key = filename
    ? `covers/${filename}${ext}`
    : `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const uploadUrl = `${SUPA_URL}/storage/v1/object/${key}`;
  const publicUrl = `${SUPA_URL}/storage/v1/object/public/${key}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: imageData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      error: `Supabase upload: HTTP ${res.status}`,
      detail: errText.slice(0, 300),
    };
  }

  return { url: publicUrl, key };
}

export async function POST(request: Request) {
  if (!SUPA_URL || !SUPA_SERVICE_KEY) {
    return Response.json({ error: "Supabase Storage not configured" }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";

  // ── Mode 1: FormData (file upload from camera / file picker) ──
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file)
        return Response.json({ error: "No file in FormData" }, { status: 400 });

      const buffer = await file.arrayBuffer();
      const filename =
        (formData.get("filename") as string) ||
        file.name.replace(/\.[^.]+$/, "");
      const result = await uploadToSupabase(
        buffer,
        file.type || "image/jpeg",
        filename
      );
      if ("error" in result) {
        return Response.json(result, { status: 500 });
      }
      return Response.json(result);
    } catch (e: any) {
      return Response.json(
        { error: `FormData parse failed: ${e.message}` },
        { status: 400 }
      );
    }
  }

  // ── Mode 2 & 3: JSON body ──
  let body: { imageUrl?: string; base64?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error:
          "Invalid JSON. Send either: {imageUrl}, {base64}, or FormData with file.",
      },
      { status: 400 }
    );
  }

  // ── Mode 2: Base64 (clipboard paste) ──
  if (body.base64) {
    try {
      const b64 = body.base64.replace(/^data:image\/\w+;base64,/, "");
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Detect content type from base64 prefix
      let mimeType = "image/jpeg";
      if (body.base64.startsWith("data:image/png")) mimeType = "image/png";
      else if (body.base64.startsWith("data:image/webp")) mimeType = "image/webp";
      else if (body.base64.startsWith("data:image/gif")) mimeType = "image/gif";

      const result = await uploadToSupabase(
        bytes.buffer,
        mimeType,
        body.filename
      );
      if ("error" in result) {
        return Response.json(result, { status: 500 });
      }
      return Response.json(result);
    } catch (e: any) {
      return Response.json(
        { error: `Base64 decode failed: ${e.message}` },
        { status: 400 }
      );
    }
  }

  // ── Mode 3: Download from URL ──
  const { imageUrl, filename } = body;
  if (!imageUrl)
    return Response.json(
      {
        error:
          "One of: imageUrl, base64, or file (FormData) required",
      },
      { status: 400 }
    );

  let imageData: ArrayBuffer;
  let ct = "image/jpeg";
  try {
    const res = await fetch(imageUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    imageData = await res.arrayBuffer();
    ct = res.headers.get("content-type") || "image/jpeg";
  } catch (e: any) {
    return Response.json(
      { error: `Download failed: ${e.message}` },
      { status: 400 }
    );
  }

  const result = await uploadToSupabase(imageData, ct, filename);
  if ("error" in result) {
    return Response.json(result, { status: 500 });
  }
  return Response.json(result);
}
