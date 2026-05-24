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
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Trigger</h1>
        <p className="text-sm text-gray-500 mt-0.5">{trigger.name}</p>
      </div>
      <TriggerForm initial={trigger} />
    </div>
  );
}
