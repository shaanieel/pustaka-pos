// POST /api/upload-gallery
// Upload foto gallery ke Supabase Storage via service key (bypass RLS)

export const runtime = "edge";

const SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "testimoni" atau "amanah"

    if (!file) {
      return Response.json({ error: "File tidak ditemukan" }, { status: 400 });
    }
    if (type !== "testimoni" && type !== "amanah") {
      return Response.json({ error: "Type harus testimoni atau amanah" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload ke Supabase Storage dengan service key
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/gallery/${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": file.type || "image/jpeg",
          "x-upsert": "false",
        },
        body: await file.arrayBuffer(),
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return Response.json(
        { error: "Gagal upload ke storage", detail: errText },
        { status: uploadRes.status }
      );
    }

    // Dapatkan public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/gallery/${fileName}`;

    // Insert ke gallery_items dengan service key
    const caption = formData.get("caption") as string || null;
    const sortOrder = parseInt(formData.get("sort_order") as string) || 0;

    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/gallery_items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          type,
          image_url: publicUrl,
          caption: caption || null,
          sort_order: sortOrder,
        }),
      }
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return Response.json(
        { error: "Gagal insert ke database", detail: errText },
        { status: insertRes.status }
      );
    }

    const inserted = await insertRes.json();
    return Response.json({ success: true, data: inserted[0] || inserted, url: publicUrl });
  } catch (err: any) {
    return Response.json({ error: err.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
