import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { evaluateConditions, getFailureReason } from "@/lib/rule-engine";
import { renderTemplate } from "@/lib/template-renderer";
import { sendEmail, Attachment } from "@/lib/mailer";
import { Trigger } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_name, user_id, payload = {}, idempotency_key, attachments: rawAttachments = [] } = body;

    if (!event_name || !user_id) {
      return NextResponse.json({ error: "event_name and user_id required" }, { status: 400 });
    }

    // 0. Idempotency check — reject duplicate events
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

    // 1. Log the event
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .insert({ event_name, user_id, payload, ...(idempotency_key ? { idempotency_key } : {}) })
      .select()
      .single();

    if (eventErr) {
      console.error("[events] insert error:", eventErr);
      return NextResponse.json({ error: eventErr.message }, { status: 500 });
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
      const mergedPayload = { ...payload, user: profile };
      const conditionsMet = evaluateConditions(trigger.conditions, mergedPayload);
      if (!conditionsMet) {
        const reason = getFailureReason(trigger.conditions, mergedPayload) ?? "conditions_not_met";
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason });
        continue;
      }

      // 5. Check unsubscribe
      if (profile?.unsubscribed_product) {
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "unsubscribed" });
        continue;
      }

      // 6. Deduplication
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

      const recipientEmail = (profile?.email ?? payload.email) as string | undefined;
      const toAddress = process.env.RESEND_DEV_OVERRIDE_EMAIL ?? recipientEmail;

      if (!recipientEmail) {
        results.push({ trigger_id: trigger.id, trigger: trigger.name, status: "skipped", reason: "no_email" });
        continue;
      }

      // 8a. Scheduled — queue it
      if (trigger.scheduled_for) {
        const sendAt = new Date(trigger.scheduled_for);
        await supabaseAdmin.from("scheduled_sends").insert({
          trigger_id: trigger.id,
          template_id: trigger.template_id,
          event_id: event.id,
          user_id,
          recipient_email: recipientEmail,
          rendered_subject: subject,
          rendered_html: html,
          send_at: sendAt.toISOString(),
          status: "pending",
        });
        results.push({
          trigger_id: trigger.id,
          trigger: trigger.name,
          status: "scheduled",
          send_at: sendAt.toISOString(),
        });
        continue;
      }

      // 8b. Send immediately
      try {
        const attachments: Attachment[] = rawAttachments.map((a: { filename: string; content: string; contentType: string }) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
          contentType: a.contentType,
        }));
        const messageId = await sendEmail({ to: toAddress!, subject, html, attachments });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
