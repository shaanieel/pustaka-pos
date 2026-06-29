// POST /api/upload-cover
// Body: { imageUrl: string, filename?: string }
// Downloads image from URL, uploads to Cloudflare R2 via fetch + manual AWS SigV4 signing
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

function buildStringToSign(region: string, service: string, amzDate: string, canonicalRequestHash: string): string {
  const dateStamp = amzDate.slice(0, 8);
  return `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${region}/${service}/aws4_request\n${canonicalRequestHash}`;
}

function buildAuthHeader(
  accessKey: string, dateStamp: string, region: string, service: string,
  signedHeaders: string, signature: string
): string {
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${dateStamp}/${region}/${service}/aws4_request,SignedHeaders=${signedHeaders},Signature=${signature}`;
}

export async function POST(request: Request) {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    return Response.json({ error: "R2 not configured" }, { status: 500 });
  }

  let body: { imageUrl?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageUrl, filename } = body;
  if (!imageUrl) return Response.json({ error: "imageUrl required" }, { status: 400 });

  // 1) Download image
  let imageData: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(imageUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    imageData = await res.arrayBuffer();
    contentType = res.headers.get("content-type") || "image/jpeg";
  } catch (e: any) {
    return Response.json({ error: `Download failed: ${e.message}` }, { status: 400 });
  }

  // 2) Determine key
  const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
  const key = filename
    ? `covers/${filename}${ext}`
    : `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  // 3) SigV4 signing
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
  const stringToSign = buildStringToSign(region, service, amzDate, canonicalReqHash);
  const signingKey = await getSignatureKey(R2_SECRET_KEY, dateStamp, region, service);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(";");
  const authHeader = buildAuthHeader(R2_ACCESS_KEY, dateStamp, region, service, signedHeaders, signature);

  // 4) Upload to R2
  const url = `${endpoint}/${bucket}/${key}`;
  try {
    const putRes = await fetch(url, {
      method: "PUT",
      headers: { ...headers, Authorization: authHeader },
      body: imageData,
    });
    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return Response.json({ error: `R2 upload: HTTP ${putRes.status}`, detail: errText.slice(0, 300) }, { status: 500 });
    }
  } catch (e: any) {
    return Response.json({ error: `R2 network: ${e.message}` }, { status: 500 });
  }

  // 5) Public URL
  const publicBase = R2_PUBLIC_URL || `${endpoint}/${bucket}`;
  const r2Url = `${publicBase}/${key}`;

  return Response.json({ url: r2Url, key });
}
