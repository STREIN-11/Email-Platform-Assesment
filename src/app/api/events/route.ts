import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { evaluateConditions } from "@/lib/rule-engine";
import { renderTemplate } from "@/lib/template-renderer";
import { sendEmail } from "@/lib/mailer";
import { Trigger } from "@/types";

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const { event_name, user_id, payload = {} } = body;

  if (!event_name || !user_id) {
    return NextResponse.json({ error: "event_name and user_id required" }, { status: 400 });
  }

  // 1. Log the event
  const { data: event, error: eventErr } = await supabaseAdmin
    .from("events")
    .insert({ event_name, user_id, payload })
    .select()
    .single();

  if (eventErr) {
    console.error("[events] insert error:", eventErr);
    return NextResponse.json({ step: "insert_event", error: eventErr.message, code: eventErr.code }, { status: 500 });
  }

  // 2. Fetch active triggers for this event
  const { data: triggers } = await supabaseAdmin
    .from("triggers")
    .select("*, templates(*)")
    .eq("event_name", event_name)
    .eq("active", true);

  if (!triggers?.length) {
    await supabaseAdmin.from("events").update({ processed: true }).eq("id", event.id);
    return NextResponse.json({ event_id: event.id, results: [], matched: 0 });
  }

  // 3. Fetch user profile
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  const results = [];

  for (const trigger of triggers as Trigger[]) {
    // 4. Evaluate conditions
    const conditionsMet = evaluateConditions(trigger.conditions, { ...payload, user: profile });
    if (!conditionsMet) {
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "conditions_not_met" });
      continue;
    }

    // 5. Check unsubscribe
    if (profile?.unsubscribed_product) {
      await supabaseAdmin.from("send_log").insert({
        trigger_id: trigger.id, template_id: trigger.template_id,
        event_id: event.id, user_id, recipient_email: profile.email,
        status: "skipped", error: "unsubscribed",
      });
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "unsubscribed" });
      continue;
    }

    // 6. Deduplication — once_per_user check
    if (trigger.once_per_user) {
      const { data: existing } = await supabaseAdmin
        .from("send_log")
        .select("id")
        .eq("trigger_id", trigger.id)
        .eq("user_id", user_id)
        .eq("status", "sent")
        .limit(1);

      if (existing?.length) {
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "already_sent" });
        continue;
      }
    }

    // 7. Render template
    const template = trigger.templates!;
    const { html, subject } = renderTemplate(template.html_body, template.subject, {
      ...payload,
      email: profile?.email,
    });

    // 8. Send via Resend
    const recipientEmail = (profile?.email ?? payload.email) as string | undefined;
    // In development without a verified domain, Resend only allows sending to your own address.
    // Set RESEND_DEV_OVERRIDE_EMAIL in .env.local to redirect all sends there.
    const toAddress = process.env.RESEND_DEV_OVERRIDE_EMAIL ?? recipientEmail;

    if (!recipientEmail) {
      results.push({ trigger_id: trigger.id, status: "skipped", reason: "no_email" });
      continue;
    }

    try {
      const messageId = await sendEmail({ to: toAddress!, subject, html });

      await supabaseAdmin.from("send_log").insert({
        trigger_id: trigger.id, template_id: trigger.template_id,
        event_id: event.id, user_id, recipient_email: recipientEmail,
        status: "sent", provider_id: messageId,
      });

      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "sent", provider_id: messageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error("[events] send error:", msg);
      await supabaseAdmin.from("send_log").insert({
        trigger_id: trigger.id, template_id: trigger.template_id,
        event_id: event.id, user_id, recipient_email: recipientEmail,
        status: "failed", error: msg,
      });
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "failed", error: msg });
    }
  }

  await supabaseAdmin.from("events").update({ processed: true }).eq("id", event.id);
  return NextResponse.json({ event_id: event.id, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[events] unhandled error:", msg);
    return NextResponse.json({ step: "unhandled", error: msg }, { status: 500 });
  }
}
