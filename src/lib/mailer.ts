import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export type Attachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments = [],
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}) {
  const info = await transporter.sendMail({
    from: `"${process.env.GMAIL_FROM_NAME ?? "EmailPlatform"}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
  return info.messageId;
}
