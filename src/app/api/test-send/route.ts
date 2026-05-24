import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { renderTemplate } from "@/lib/template-renderer";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { template_id, to, sample_data = {} } = await req.json();

  const { data: template, error } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("id", template_id)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { html, subject } = renderTemplate(template.html_body, template.subject, sample_data);

  try {
    const messageId = await sendEmail({ to, subject: `[TEST] ${subject}`, html });
    return NextResponse.json({ provider_id: messageId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
