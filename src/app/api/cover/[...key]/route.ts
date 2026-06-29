// /api/cover/[...key]
// GET  : Proxy ambil gambar dari R2 (private bucket) → serve ke browser
// DELETE : Hapus gambar dari R2
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

export async function GET(
  _request: Request,
  { params }: { params: { key: string[] } }
) {
  const key = params.key.join("/");
  if (!key) return new Response("Not found", { status: 404 });

  const r2Res = await r2.fetch(`${R2_BASE}/${key}`);
  if (!r2Res.ok) {
    return new Response(`R2 error: ${r2Res.status}`, { status: r2Res.status });
  }

  const contentType = r2Res.headers.get("content-type") || "image/jpeg";
  const body = await r2Res.arrayBuffer();

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { key: string[] } }
) {
  const key = params.key.join("/");
  if (!key) return Response.json({ error: "Key required" }, { status: 400 });

  const r2Res = await r2.fetch(`${R2_BASE}/${key}`, { method: "DELETE" });

  if (!r2Res.ok) {
    return Response.json(
      { error: `R2 delete: HTTP ${r2Res.status}` },
      { status: r2Res.status }
    );
  }

  return Response.json({ success: true, key });
}
