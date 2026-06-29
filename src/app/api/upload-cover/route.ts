// POST /api/upload-cover
// Body: { imageUrl: string, filename?: string }
// Downloads image from URL, uploads to Cloudflare R2 (S3-compatible), returns R2 public URL
// Uses @aws-sdk/client-s3 for proper SigV4 signing
export const runtime = "nodejs";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "pustaka-pos-covers";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

function getS3Client(): S3Client | null {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) return null;
  return new S3Client({
    endpoint: R2_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

export async function POST(request: Request) {
  const s3 = getS3Client();
  if (!s3) {
    return Response.json(
      { error: "R2 not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars." },
      { status: 500 }
    );
  }

  let body: { imageUrl?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageUrl, filename } = body;
  if (!imageUrl) {
    return Response.json({ error: "imageUrl is required" }, { status: 400 });
  }

  // 1) Download image
  let imageBuffer: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(imageUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    imageBuffer = await res.arrayBuffer();
    contentType = res.headers.get("content-type") || "image/jpeg";
  } catch (e: any) {
    return Response.json({ error: `Failed to download image: ${e.message}` }, { status: 400 });
  }

  // 2) Determine key & extension
  const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
  const key = filename
    ? `covers/${filename}${ext}`
    : `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  // 3) Upload to R2 via S3 SDK
  try {
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: Buffer.from(imageBuffer),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    await s3.send(cmd);
  } catch (e: any) {
    return Response.json(
      { error: `R2 upload failed: ${e.message}`, detail: String(e) },
      { status: 500 }
    );
  }

  // 4) Public URL
  const publicBase = R2_PUBLIC_URL || `${R2_ENDPOINT}/${R2_BUCKET}`;
  const r2Url = `${publicBase}/${key}`;

  return Response.json({ url: r2Url, key });
}
