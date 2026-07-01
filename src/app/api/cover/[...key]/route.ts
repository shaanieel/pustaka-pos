// /api/cover/[...key]
// GET  : Proxy ambil gambar dari R2 (private bucket) → serve ke browser
// DELETE : Hapus gambar dari R2
import { AwsClient } from "aws4fetch";

export const runtime = "edge";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "poster-buku";
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
