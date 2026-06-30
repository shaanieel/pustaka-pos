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

// PATCH /api/orders/[id] — update order payment status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { payment_status, paid_amount } = body;

    if (!payment_status) {
      return NextResponse.json(
        { error: "payment_status required" },
        { status: 400 }
      );
    }

    const admin = getAdmin();

    // Get order to find final_amount if paid_amount not provided
    let updateData: Record<string, unknown> = { payment_status };

    if (payment_status === "lunas") {
      // If paid_amount provided use it, else fetch order's final_amount
      if (paid_amount != null) {
        updateData.paid_amount = paid_amount;
      } else {
        const { data: order } = await admin
          .from("orders")
          .select("final_amount")
          .eq("id", params.id)
          .single();
        updateData.paid_amount = order?.final_amount ?? 0;
      }
    }

    const { data, error } = await admin
      .from("orders")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
