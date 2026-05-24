import TriggerForm from "@/components/TriggerForm";

export default function NewTriggerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">New Trigger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Define when an email fires and under what conditions.</p>
      </div>
      <TriggerForm />
    </div>
  );
}
