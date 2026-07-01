// POST /api/upload-cover
// 1. Kirim file ke Python Image Service (port 8000)
// 2. Image service: remove bg → crop → enhance → resize → WebP → upload R2
// 3. Balikin URL R2 ke client
// 4. Fallback: kalau service mati, upload langsung ke R2
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
  process.env.IMAGE_SERVICE_URL || "http://127.0.0.1:8000";

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

  // ── Hanya terima FormData ──
  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Hanya menerima FormData upload" },
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

    // ── Coba lewat Image Service (SSE) ──
    try {
      const bgFormData = new FormData();
      bgFormData.append(
        "file",
        new Blob([originalBuffer], { type: file.type }),
        "input.jpg"
      );

      const res = await fetch(`${IMAGE_SERVICE_URL}/process`, {
        method: "POST",
        body: bgFormData,
        signal: AbortSignal.timeout(120000), // 2 menit timeout (full pipeline)
      });

      if (res.ok) {
        // Read SSE stream sampai dapat event "done"
        const reader = res.body?.getReader();
        if (reader) {
          let buffer = "";
          let r2Url: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += new TextDecoder().decode(value);
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const event = JSON.parse(line.slice(6));
                  console.log(
                    `[ImageService ${event.job_id}] ${event.step}: ${event.message}`
                  );

                  if (event.step === "done" && event.url) {
                    r2Url = event.url;
                  }
                } catch {}
              }
            }
          }

          if (r2Url) {
            console.log(`✅ Image Service selesai: ${r2Url}`);
            return Response.json({ url: r2Url, processed: true });
          }
        }
      }

      // Kalau SSE selesai tapi gak dapet URL → fallback
      console.warn("⚠️ Image Service selesai tanpa URL — fallback ke direct upload");
    } catch (svcErr: any) {
      console.warn(`⚠️ Image Service error: ${svcErr.message} — fallback ke direct upload`);
    }

    // ── Fallback: upload langsung ke R2 ──
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
