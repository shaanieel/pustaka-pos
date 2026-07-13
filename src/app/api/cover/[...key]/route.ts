// GET /api/cover/[...key]
// Proxy: serve image dari R2 bucket "poster-buku"
// Supports multi-segment keys: covers/xxx.webp, xxx.jpg, dll.
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const keyStr = key.join("/");

  if (!keyStr || keyStr.includes("..")) {
    return new Response("Invalid key", { status: 400 });
  }

  try {
    const res = await r2.fetch(`${R2_BASE}/${keyStr}`, { method: "GET" });

    if (!res.ok) {
      return new Response(`Not found: ${res.status}`, { status: res.status });
    }

    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new Response(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return new Response(`Proxy error: ${e.message}`, { status: 502 });
  }
}

// DELETE /api/cover/[...key]
// Hapus cover dari R2 (digunakan pas upload cover baru atau hapus buku)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const keyStr = key.join("/");

  if (!keyStr || keyStr.includes("..")) {
    return new Response("Invalid key", { status: 400 });
  }

  try {
    const res = await r2.fetch(`${R2_BASE}/${keyStr}`, { method: "DELETE" });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return new Response(`R2 delete failed: ${res.status} ${errText}`, {
        status: res.status,
      });
    }

    return new Response("Deleted", { status: 200 });
  } catch (e: any) {
    return new Response(`Delete error: ${e.message}`, { status: 502 });
  }
}
