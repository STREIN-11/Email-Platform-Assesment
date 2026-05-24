import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/mailer";

// Protect with a secret so only your scheduler can call this
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

// Also allow GET so you can trigger manually from the browser during dev
export async function GET() {
  return runCron();
}

async function runCron() {
  // Fetch all pending sends that are due now
  const { data: due, error } = await supabaseAdmin
    .from("scheduled_sends")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ processed: 0 });

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const toAddress = process.env.RESEND_DEV_OVERRIDE_EMAIL ?? row.recipient_email;
    try {
      const messageId = await sendEmail({
        to: toAddress,
        subject: row.rendered_subject,
        html: row.rendered_html,
      });

      await supabaseAdmin
        .from("scheduled_sends")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id);

      // Also write to send_log for audit trail
      await supabaseAdmin.from("send_log").insert({
        trigger_id: row.trigger_id,
        template_id: row.template_id,
        event_id: row.event_id,
        user_id: row.user_id,
        recipient_email: row.recipient_email,
        status: "sent",
        provider_id: messageId,
      });

      sent++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      await supabaseAdmin
        .from("scheduled_sends")
        .update({ status: "failed", error: msg })
        .eq("id", row.id);
      failed++;
    }
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}
