import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { renderTemplate } from "@/lib/template-renderer";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { data, error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `[TEST] ${subject}`,
    html,
  });

  if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });
  return NextResponse.json({ provider_id: data?.id });
}
