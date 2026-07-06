// POST /api/upload-cover
// Upload cover langsung ke R2 (tanpa AI pipeline)
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

// Hardcoded R2 credentials — bucket & Pages project on same account.
const R2_ACCOUNT_ID = "5f3c24963db02b0b6a73df072d2675e2";
const R2_ACCESS_KEY_ID = "5612ca8b1d07639a96a0b8d49a47349d";
const R2_SECRET_ACCESS_KEY = "aaa17675146e84798a748d641e663669a05f762639bce4fe3c90ab563843bdab";
const R2_BUCKET = "poster-buku";
const R2_BASE = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const IMAGE_SERVICE_URL =
  process.env.IMAGE_SERVICE_URL || "https://supreme-interval-alt-expected.trycloudflare.com";

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
    headers: {
      "Content-Type": contentType || "image/jpeg",
      "Content-Length": String(imageData.byteLength),
    },
    body: imageData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      error: `R2 upload: HTTP ${res.status}`,
      detail: errText.slice(0, 300),
    };
  }

  const proxyUrl = `/api/cover/${key}`;
  return { url: proxyUrl, key };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  // ── JSON mode: download image dari URL, terus proses ──
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { imageUrl, filename } = body;
      if (!imageUrl) {
        return Response.json({ error: "imageUrl required" }, { status: 400 });
      }

      // Download image dari URL eksternal
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!imgRes.ok) {
        throw new Error(`Download failed: HTTP ${imgRes.status}`);
      }
      const imgBlob = await imgRes.blob();
      const originalBuffer = await imgBlob.arrayBuffer();
      const ext = imgBlob.type.includes("png") ? "png" : imgBlob.type.includes("webp") ? "webp" : "jpg";
      const r2Key = filename
        ? `${filename}.${ext}`
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // Upload langsung ke R2 (tanpa AI pipeline untuk Google Books cover)
      const r2FetchUrl = `${R2_BASE}/${r2Key}`;
      const r2Res = await r2.fetch(r2FetchUrl, {
        method: "PUT",
        headers: {
          "Content-Type": imgBlob.type || "image/jpeg",
          "Content-Length": String(originalBuffer.byteLength),
        },
        body: originalBuffer,
      });
      if (!r2Res.ok) {
        const errText = await r2Res.text().catch(() => "");
        return Response.json(
          { error: `R2 upload: HTTP ${r2Res.status}`, detail: errText.slice(0, 300) },
          { status: 500 }
        );
      }
      const proxyUrl = `/api/cover/${r2Key}`;
      return Response.json({ url: proxyUrl, key: r2Key, processed: false });
    } catch (e: any) {
      return Response.json(
        { error: `JSON upload failed: ${e.message}` },
        { status: 500 }
      );
    }
  }

  // ── FormData mode ──
  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Hanya menerima multipart/form-data atau application/json" },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file in FormData" }, { status: 400 });

    const filename =
      (formData.get("filename") as string) ||
      file.name.replace(/\.[^.]+$/, "");

    const originalBuffer = await file.arrayBuffer();

    // ── Upload langsung ke R2 (no AI pipeline) ──
    const result = await uploadToR2(originalBuffer, "image/jpeg", filename);
    if ("error" in result) return Response.json(result, { status: 500 });

    return Response.json({ ...result, processed: false });
  } catch (e: any) {
    return Response.json(
      { error: `Upload failed: ${e.message}` },
      { status: 400 }
    );
  }
}
