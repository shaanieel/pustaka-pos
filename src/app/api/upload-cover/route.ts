// POST /api/upload-cover
// Supports 3 input modes:
//   1. JSON: { imageUrl: string } — download from URL
//   2. FormData: { file: File } — direct upload (camera / file picker)
//   3. JSON: { base64: string, filename?: string } — clipboard paste
// Uploads to Cloudflare R2 via fetch + manual AWS SigV4 signing
// Edge-compatible (no Node.js deps)
export const runtime = "edge";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "pustaka-pos-covers";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// ===== AWS SigV4 Signing (edge-compatible, no external deps) =====

async function sha256(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = key instanceof Uint8Array ? new Uint8Array(key) : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function buildCanonicalRequest(method: string, path: string, query: string, headers: Record<string, string>, payloadHash: string): string {
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .join("\n");
  const signedHeaders = Object.keys(headers)
    .sort()
    .map((k) => k.toLowerCase())
    .join(";");
  return [method, path, query, canonicalHeaders + "\n", signedHeaders, payloadHash].join("\n");
}

function buildAuthHeader(
  accessKey: string, dateStamp: string, region: string, service: string,
  signedHeaders: string, signature: string
): string {
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${dateStamp}/${region}/${service}/aws4_request,SignedHeaders=${signedHeaders},Signature=${signature}`;
}

async function uploadToR2(imageData: ArrayBuffer, contentType: string, filename?: string) {
  const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : contentType.includes("gif") ? ".gif" : ".jpg";
  const key = filename
    ? `covers/${filename}${ext}`
    : `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const method = "PUT";
  const endpoint = R2_ENDPOINT.replace(/\/$/, "");
  const bucket = R2_BUCKET;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(imageData);
  const path = `/${bucket}/${key}`;
  const query = "";

  const headers: Record<string, string> = {
    "Host": new URL(endpoint).host,
    "Content-Type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const canonicalReq = buildCanonicalRequest(method, path, query, headers, payloadHash);
  const canonicalReqHash = await sha256(canonicalReq);
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${region}/${service}/aws4_request\n${canonicalReqHash}`;
  const signingKey = await getSignatureKey(R2_SECRET_KEY, dateStamp, region, service);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(";");
  const authHeader = buildAuthHeader(R2_ACCESS_KEY, dateStamp, region, service, signedHeaders, signature);

  const url = `${endpoint}/${bucket}/${key}`;
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { ...headers, Authorization: authHeader },
    body: imageData,
  });
  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => "");
    return { error: `R2 upload: HTTP ${putRes.status}`, detail: errText.slice(0, 300) };
  }

  const publicBase = R2_PUBLIC_URL || `${endpoint}/${bucket}`;
  const r2Url = `${publicBase}/${key}`;
  return { url: r2Url, key };
}

export async function POST(request: Request) {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    return Response.json({ error: "R2 not configured" }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";

  // ── Mode 1: FormData (file upload from camera / file picker) ──
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file in FormData" }, { status: 400 });

      const buffer = await file.arrayBuffer();
      const filename = (formData.get("filename") as string) || file.name.replace(/\.[^.]+$/, "");
      const result = await uploadToR2(buffer, file.type || "image/jpeg", filename);
      if ("error" in result) {
        return Response.json(result, { status: 500 });
      }
      return Response.json(result);
    } catch (e: any) {
      return Response.json({ error: `FormData parse failed: ${e.message}` }, { status: 400 });
    }
  }

  // ── Mode 2 & 3: JSON body ──
  let body: { imageUrl?: string; base64?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON. Send either: {imageUrl}, {base64}, or FormData with file." }, { status: 400 });
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

      const result = await uploadToR2(bytes.buffer, mimeType, body.filename);
      if ("error" in result) {
        return Response.json(result, { status: 500 });
      }
      return Response.json(result);
    } catch (e: any) {
      return Response.json({ error: `Base64 decode failed: ${e.message}` }, { status: 400 });
    }
  }

  // ── Mode 3: Download from URL (original behavior) ──
  const { imageUrl, filename } = body;
  if (!imageUrl) return Response.json({ error: "One of: imageUrl, base64, or file (FormData) required" }, { status: 400 });

  let imageData: ArrayBuffer;
  let ct = "image/jpeg";
  try {
    const res = await fetch(imageUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    imageData = await res.arrayBuffer();
    ct = res.headers.get("content-type") || "image/jpeg";
  } catch (e: any) {
    return Response.json({ error: `Download failed: ${e.message}` }, { status: 400 });
  }

  const result = await uploadToR2(imageData, ct, filename);
  if ("error" in result) {
    return Response.json(result, { status: 500 });
  }
  return Response.json(result);
}
