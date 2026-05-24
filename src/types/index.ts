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
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";
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
  created_at: string;
  updated_at: string;
  templates?: Template;
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
