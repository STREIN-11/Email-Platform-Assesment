import { supabaseAdmin } from "@/lib/supabase-admin";
import TriggerForm from "@/components/TriggerForm";
import { notFound } from "next/navigation";

export default async function EditTriggerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: trigger } = await supabaseAdmin
    .from("triggers")
    .select("*, templates(*)")
    .eq("id", id)
    .single();
  if (!trigger) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Trigger</h1>
      <TriggerForm initial={trigger} />
    </div>
  );
}
