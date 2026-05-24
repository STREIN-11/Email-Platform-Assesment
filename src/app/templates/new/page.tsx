import TemplateForm from "@/components/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">New Template</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new email template with dynamic placeholders.</p>
      </div>
      <TemplateForm />
    </div>
  );
}
