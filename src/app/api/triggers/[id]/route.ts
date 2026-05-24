import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // Strip joined relations and read-only fields before updating
  const { templates: _t, id: _id, created_at: _c, ...fields } = body;
  const { data, error } = await supabaseAdmin
    .from("triggers")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, templates(id, name, subject)")
    .single();
  if (error) {
    console.error("[PUT /api/triggers] Supabase error:", JSON.stringify(error, null, 2), "\nPayload:", JSON.stringify(fields, null, 2));
    return NextResponse.json({ error: error.message, detail: error.details, hint: error.hint, code: error.code }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("triggers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
