import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g";

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// GET /api/categories — list all categories from DB
export async function GET() {
  try {
    const admin = getAdmin();
    const { data, error } = await admin
      .from("categories")
      .select("name")
      .order("name");

    if (error) {
      // Table might not exist yet — return empty
      return NextResponse.json({ categories: [] });
    }

    return NextResponse.json({ categories: data?.map((c) => c.name) || [] });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

// POST /api/categories — add a new category
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name required" },
        { status: 400 }
      );
    }

    const admin = getAdmin();
    const { data, error } = await admin
      .from("categories")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      // Duplicate — already exists, that's fine
      if (error.code === "23505") {
        return NextResponse.json({ name: name.trim(), existed: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ name: data.name, created: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
