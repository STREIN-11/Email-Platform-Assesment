import { supabaseAdmin } from "@/lib/supabase-admin";
import TemplateForm from "@/components/TemplateForm";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: template } = await supabaseAdmin.from("templates").select("*").eq("id", id).single();
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Template</h1>
        <p className="text-sm text-gray-500 mt-0.5">{template.name}</p>
      </div>
      <TemplateForm initial={template} />
    </div>
  );
}
