import Link from "next/link";
import { LayoutTemplate, Zap, FlaskConical, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage email templates, define automation triggers, and test the full delivery loop.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <NavCard
          href="/templates"
          icon={<LayoutTemplate size={18} className="text-indigo-500" />}
          iconBg="bg-indigo-50"
          title="Template Library"
          desc="Browse, edit, and preview email templates. Use AI to draft or improve copy."
          cta="Manage Templates"
        />
        <NavCard
          href="/triggers"
          icon={<Zap size={18} className="text-amber-500" />}
          iconBg="bg-amber-50"
          title="Trigger Rules"
          desc="Define when emails fire — event name, conditions, and deduplication logic."
          cta="Manage Triggers"
        />
        <NavCard
          href="/playground"
          icon={<FlaskConical size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-50"
          title="Event Playground"
          desc="Fire a test event and watch the rule engine evaluate, render, and send in real time."
          cta="Open Playground"
        />
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {[
            { step: "1", label: "Event arrives", sub: "POST /api/events" },
            { step: "→", label: "", sub: "" },
            { step: "2", label: "Rules evaluated", sub: "Conditions matched" },
            { step: "→", label: "", sub: "" },
            { step: "3", label: "Email sent", sub: "Via Resend" },
          ].map((item, i) =>
            item.step === "→" ? (
              <div key={i} className="hidden md:flex justify-center text-gray-300 text-xl">→</div>
            ) : (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 mono">{item.sub}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function NavCard({
  href, icon, iconBg, title, desc, cta,
}: {
  href: string; icon: React.ReactNode; iconBg: string;
  title: string; desc: string; cta: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-4"
    >
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
      <div className="flex-1">
        <h2 className="font-semibold text-gray-900 text-sm mb-1">{title}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:gap-2 transition-all">
        {cta} <ArrowRight size={12} />
      </div>
    </Link>
  );
}
