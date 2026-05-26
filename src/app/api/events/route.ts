import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { evaluateConditions, getFailureReason } from "@/lib/rule-engine";
import { renderTemplate } from "@/lib/template-renderer";
import { sendEmail, Attachment } from "@/lib/mailer";
import { Trigger } from "@/types";

type Recipient = { user_id: string; payload?: Record<string, unknown>; email?: string; emails?: string[] };

async function processRecipient(
  recipient: Recipient,
  event_name: string,
  event_id: string,
  triggers: Trigger[],
  rawAttachments: { filename: string; content: string; contentType: string }[]
) {
  const { user_id, payload = {}, email: overrideEmail, emails: overrideEmails } = recipient;
  const results = [];

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  for (const trigger of triggers) {
    const mergedPayload = { ...payload, user: profile };

    if (!evaluateConditions(trigger.conditions, mergedPayload)) {
      const reason = getFailureReason(trigger.conditions, mergedPayload) ?? "conditions_not_met";
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason });
      continue;
    }

    if (profile?.unsubscribed_product) {
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "unsubscribed" });
      continue;
    }

    // once_per_user check — only once per user regardless of how many emails
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

    const template = trigger.templates!;

    // Build list of emails to send to
    const emailList: string[] = overrideEmails?.length
      ? overrideEmails
      : overrideEmail
      ? [overrideEmail]
      : profile?.email
      ? [profile.email]
      : (payload.email as string)
      ? [payload.email as string]
      : [];

    if (!emailList.length) {
      results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "no_email" });
      continue;
    }

    const attachments: Attachment[] = rawAttachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    }));

    for (const recipientEmail of emailList) {
      const { html, subject } = renderTemplate(template.html_body, template.subject, {
        ...payload,
        email: recipientEmail,
      });

      const toAddress = process.env.RESEND_DEV_OVERRIDE_EMAIL ?? recipientEmail;

      if (trigger.scheduled_for) {
        const sendAt = new Date(trigger.scheduled_for);
        await supabaseAdmin.from("scheduled_sends").insert({
          trigger_id: trigger.id,
          template_id: trigger.template_id,
          event_id,
          user_id,
          recipient_email: recipientEmail,
          rendered_subject: subject,
          rendered_html: html,
          send_at: sendAt.toISOString(),
          status: "pending",
        });
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "scheduled", send_at: sendAt.toISOString(), email: recipientEmail });
        continue;
      }

      try {
        const messageId = await sendEmail({ to: toAddress, subject, html, attachments });
        await supabaseAdmin.from("send_log").insert({
          trigger_id: trigger.id, template_id: trigger.template_id,
          event_id, user_id, recipient_email: recipientEmail,
          status: "sent", provider_id: messageId,
        });
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "sent", provider_id: messageId, email: recipientEmail });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown error";
        console.error("[events] send error:", msg);
        await supabaseAdmin.from("send_log").insert({
          trigger_id: trigger.id, template_id: trigger.template_id,
          event_id, user_id, recipient_email: recipientEmail,
          status: "failed", error: msg,
        });
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "failed", error: msg, email: recipientEmail });
      }
    }
  }

  return { user_id, results };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      event_name,
      user_id,
      payload = {},
      idempotency_key,
      attachments: rawAttachments = [],
      recipients,
      emails,
    } = body;

    // Build recipients list — support both single user_id and recipients array
    const recipientList: Recipient[] = recipients?.length
      ? recipients
      : user_id
      ? [{ user_id, payload, emails }]
      : [];

    if (!event_name || !recipientList.length) {
      return NextResponse.json({ error: "event_name and user_id (or recipients) required" }, { status: 400 });
    }

    // Idempotency check
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("idempotency_key", idempotency_key)
        .limit(1)
        .single();
      if (existing) {
        return NextResponse.json({ event_id: existing.id, deduplicated: true });
      }
    }

    // Log the event
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .insert({ event_name, user_id: recipientList[0].user_id, payload, ...(idempotency_key ? { idempotency_key } : {}) })
      .select()
      .single();

    if (eventErr) {
      console.error("[events] insert error:", eventErr);
      return NextResponse.json({ error: eventErr.message }, { status: 500 });
    }

    // Fetch active triggers
    const { data: triggers } = await supabaseAdmin
      .from("triggers")
      .select("*, templates(*)")
      .eq("event_name", event_name)
      .eq("active", true);

    if (!triggers?.length) {
      await supabaseAdmin.from("events").update({ processed: true }).eq("id", event.id);
      return NextResponse.json({ event_id: event.id, results: [], matched: 0 });
    }

    // Process all recipients in parallel
    const allResults = await Promise.all(
      recipientList.map((r) => processRecipient(r, event_name, event.id, triggers as Trigger[], rawAttachments))
    );

    await supabaseAdmin.from("events").update({ processed: true }).eq("id", event.id);
    return NextResponse.json({ event_id: event.id, results: allResults });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[events] unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
