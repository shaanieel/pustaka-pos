import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjI2MDcsImV4cCI6MjA5ODIzODYwN30.CkJ5euA6wQFO0LcQawElxx6haSyA11ARcYjsxPloI7s";

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
