import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Email Platform</h1>
        <p className="mt-2 text-gray-500">
          Manage templates, define triggers, and automate email delivery — no engineers required.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          href="/templates"
          title="Template Library"
          desc="Browse, search, edit, and preview email templates. Use AI to draft or improve copy."
          cta="Manage Templates →"
        />
        <Card
          href="/triggers"
          title="Trigger Rules"
          desc="Define when emails fire — event name + conditions. Control deduplication and targeting."
          cta="Manage Triggers →"
        />
        <Card
          href="/playground"
          title="Event Playground"
          desc="Fire a test event and watch the rule engine evaluate, render, and send in real time."
          cta="Open Playground →"
        />
      </div>
    </div>
  );
}

function Card({ href, title, desc, cta }: { href: string; title: string; desc: string; cta: string }) {
  return (
    <Link href={href} className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-400 hover:shadow-sm transition-all">
      <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{desc}</p>
      <span className="text-sm font-medium text-indigo-600">{cta}</span>
    </Link>
  );
}
