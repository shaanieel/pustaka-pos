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

// GET /api/orders/[id] — fetch single order with items
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdmin();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", params.id);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    return NextResponse.json({ order, items: items || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] — update order fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const admin = getAdmin();

    // Build update object from provided fields
    const updateData: Record<string, unknown> = {};

    if (body.customer_name !== undefined) updateData.customer_name = body.customer_name;
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method;
    if (body.payment_status !== undefined) updateData.payment_status = body.payment_status;
    if (body.paid_amount !== undefined) updateData.paid_amount = body.paid_amount;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Auto-calculate paid_amount based on status if not explicitly provided
    if (body.payment_status && body.paid_amount === undefined) {
      const { data: order } = await admin
        .from("orders")
        .select("final_amount")
        .eq("id", params.id)
        .single();

      const finalAmount = order?.final_amount ?? 0;

      if (body.payment_status === "lunas") {
        updateData.paid_amount = finalAmount;
      } else if (body.payment_status === "belum_bayar") {
        updateData.paid_amount = 0;
      }
      // untuk belum_lunas, biarkan paid_amount seperti apa adanya
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
