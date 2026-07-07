import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjI2MDcsImV4cCI6MjA5ODIzODYwN30.CkJ5euA6wQFO0LcQawElxx6haSyA11ARcYjsxPloI7s";

const ADMIN_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g";

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    const [genresRes, subgenresRes] = await Promise.all([
      supabase.from("genres").select("id,name,slug,icon").order("sort_order"),
      supabase.from("subgenres").select("id,genre_id,name,slug").order("sort_order"),
    ]);

    return NextResponse.json({
      genres: genresRes.data || [],
      subgenres: subgenresRes.data || [],
    });
  } catch {
    return NextResponse.json({ genres: [], subgenres: [] });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, ADMIN_KEY, { auth: { persistSession: false } });
    const body = await req.json();

    if (body.type === "genre") {
      const { name } = body;
      if (!name) return NextResponse.json({ error: "Nama genre wajib diisi" }, { status: 400 });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("genres")
        .insert({ name, slug, icon: "book" })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (body.type === "subgenre") {
      const { name, genre_id } = body;
      if (!name || !genre_id) return NextResponse.json({ error: "Nama subgenre dan genre_id wajib" }, { status: 400 });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("subgenres")
        .insert({ name, genre_id, slug })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, ADMIN_KEY, { auth: { persistSession: false } });
    const body = await req.json();

    if (body.type === "genre") {
      const { id, name } = body;
      if (!id || !name) return NextResponse.json({ error: "ID dan nama wajib" }, { status: 400 });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("genres")
        .update({ name, slug })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (body.type === "subgenre") {
      const { id, name } = body;
      if (!id || !name) return NextResponse.json({ error: "ID dan nama wajib" }, { status: 400 });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("subgenres")
        .update({ name, slug })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, ADMIN_KEY, { auth: { persistSession: false } });
    const body = await req.json();

    if (body.type === "genre") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
      await supabase.from("subgenres").delete().eq("genre_id", id);
      const { error } = await supabase.from("genres").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.type === "subgenre") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
      const { error } = await supabase.from("subgenres").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal" }, { status: 500 });
  }
}
