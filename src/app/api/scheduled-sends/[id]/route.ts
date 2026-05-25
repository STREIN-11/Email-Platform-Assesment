import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // If pending — cancel it; if completed — hard delete
  const { data } = await supabaseAdmin
    .from("scheduled_sends")
    .select("status")
    .eq("id", id)
    .single();

  if (data?.status === "pending") {
    const { error } = await supabaseAdmin
      .from("scheduled_sends")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("scheduled_sends")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
