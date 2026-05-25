import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are an expert email copywriter for SaaS products. 
You write clear, friendly, and conversion-focused emails. 
Always return only the requested content — no preamble, no explanation, no markdown code fences.`;

const prompts: Record<string, (content: string, extra?: string) => string> = {
  draft: (desc) =>
    `Write a complete HTML email body for: "${desc}". Use inline styles. Include a clear CTA button.`,
  rewrite: (html, tone = "friendly") =>
    `Rewrite this email HTML in a ${tone} tone. Keep the structure and placeholders intact:\n\n${html}`,
  subject_variants: (subject) =>
    `Generate 5 subject line variants for this email subject: "${subject}". Return as a JSON array of strings.`,
  improve: (html) =>
    `Improve this email HTML for clarity, engagement, and conversion. Keep all {{placeholders}}:\n\n${html}`,
};

export async function POST(req: NextRequest) {
  const { action, content, extra } = await req.json();

  if (!prompts[action]) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (typeof content !== "string" || content.length > 10000) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  const sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
  const sanitizedExtra = typeof extra === "string" ? extra.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, 100) : extra;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompts[action](sanitized, sanitizedExtra) },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const raw = completion.choices[0].message.content ?? "";
  const result = raw.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim();

  if (action === "subject_variants") {
    try {
      const match = result.match(/\[[\s\S]*\]/);
      return NextResponse.json({ variants: JSON.parse(match?.[0] ?? "[]") });
    } catch {
      return NextResponse.json({ variants: result.split("\n").filter(Boolean) });
    }
  }

  return NextResponse.json({ result });
}
