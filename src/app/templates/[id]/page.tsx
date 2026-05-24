import { supabaseAdmin } from "@/lib/supabase-admin";
import TemplateForm from "@/components/TemplateForm";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: template } = await supabaseAdmin.from("templates").select("*").eq("id", id).single();
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Template</h1>
      <TemplateForm initial={template} />
    </div>
  );
}
