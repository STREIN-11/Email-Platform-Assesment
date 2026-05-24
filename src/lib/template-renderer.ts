export function renderTemplate(
  html: string,
  subject: string,
  data: Record<string, unknown>
): { html: string; subject: string } {
  const replace = (str: string) =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      key in data ? String(data[key]) : `{{${key}}}`
    );
  return { html: replace(html), subject: replace(subject) };
}
