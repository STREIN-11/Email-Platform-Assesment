export type Template = {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  html_body: string;
  placeholders: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Condition = {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "date_after" | "date_before" | "date_after_days" | "date_before_days";
  value: string | number | boolean;
};

export type Trigger = {
  id: string;
  name: string;
  event_name: string;
  template_id: string;
  conditions: Condition[];
  once_per_user: boolean;
  active: boolean;
  scheduled_for: string | null;
  schedule_timezone: string;
  created_at: string;
  updated_at: string;
  templates?: Template;
};

export type ScheduledSend = {
  id: string;
  trigger_id: string;
  template_id: string;
  event_id: string | null;
  user_id: string;
  recipient_email: string;
  rendered_subject: string;
  rendered_html: string;
  send_at: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  error: string | null;
  created_at: string;
  sent_at: string | null;
  triggers?: { name: string };
};

export type IncomingEvent = {
  event_name: string;
  user_id: string;
  payload: Record<string, unknown>;
};

export type SendLog = {
  id: string;
  trigger_id: string;
  template_id: string;
  event_id: string;
  user_id: string;
  recipient_email: string;
  status: "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
  sent_at: string;
};
