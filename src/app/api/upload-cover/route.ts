// POST /api/upload-cover
// Upload cover buku ke Cloudflare R2 (bucket: poster-buku)
// Edge-compatible via aws4fetch
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

const R2_ACCOUNT_ID = "5f3c24963db02b0b6a73df072d2675e2";
const R2_ACCESS_KEY_ID = "5612ca8b1d07639a96a0b8d49a47349d";
const R2_SECRET_ACCESS_KEY =
  "aaa17675146e84798a748d641e663669a05f762639bce4fe3c90ab563843bdab";
const R2_BUCKET = "poster-buku";
const R2_BASE = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

function genKey(contentType: string, filename?: string): string {
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
    ? ".webp"
    : contentType.includes("gif")
    ? ".gif"
    : ".jpg";
  return filename
    ? `${filename}${ext}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

async function uploadToR2(
  imageData: ArrayBuffer,
  contentType: string,
  filename?: string
): Promise<{ url: string; key: string } | { error: string; detail?: string }> {
  const key = genKey(contentType, filename);

  const res = await r2.fetch(`${R2_BASE}/${key}`, {
    method: "PUT",
    headers: { "Content-Type": contentType || "image/jpeg" },
    body: imageData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      error: `R2 upload: HTTP ${res.status}`,
      detail: errText.slice(0, 300),
    };
  }

  // Proxy URL — serve image via /api/cover/[key] (no need for R2 public access)
  const proxyUrl = `/api/cover/${key}`;
  return { url: proxyUrl, key };
}

export async function POST(request: Request) {
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
      const result = await uploadToR2(buffer, file.type || "image/jpeg", filename);
      if ("error" in result)
        return Response.json(result, { status: 500 });
      return Response.json(result);
    } catch (e: any) {
      return Response.json(
        { error: `FormData parse failed: ${e.message}` },
        { status: 400 }
      );
    }
  }

  // ── Mode 2: JSON body ──
  let body: { imageUrl?: string; base64?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON. Send either: {imageUrl}, {base64}, or FormData with file." },
      { status: 400 }
    );
  }

  // ── Mode 2a: Base64 (clipboard paste) ──
  if (body.base64) {
    try {
      const b64 = body.base64.replace(/^data:image\/\w+;base64,/, "");
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      let mimeType = "image/jpeg";
      if (body.base64.startsWith("data:image/png")) mimeType = "image/png";
      else if (body.base64.startsWith("data:image/webp")) mimeType = "image/webp";
      else if (body.base64.startsWith("data:image/gif")) mimeType = "image/gif";

      const result = await uploadToR2(bytes.buffer, mimeType, body.filename);
      if ("error" in result)
        return Response.json(result, { status: 500 });
      return Response.json(result);
    } catch (e: any) {
      return Response.json(
        { error: `Base64 decode failed: ${e.message}` },
        { status: 400 }
      );
    }
  }

  // ── Mode 2b: Download from URL ──
  const { imageUrl, filename } = body;
  if (!imageUrl)
    return Response.json(
      { error: "One of: imageUrl, base64, or file (FormData) required." },
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

  const result = await uploadToR2(imageData, ct, filename);
  if ("error" in result)
    return Response.json(result, { status: 500 });
  return Response.json(result);
}
