"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, Zap, FlaskConical, Mail } from "lucide-react";

const NAV = [
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/triggers", label: "Triggers", icon: Zap },
  { href: "/playground", label: "Playground", icon: FlaskConical },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] bg-[#0f1117] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Mail size={14} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">EmailPlatform</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-2 mb-2">Platform</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "bg-indigo-500/20 text-indigo-300 font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
              }`}
            >
              <Icon size={15} className={active ? "text-indigo-400" : "text-white/40"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-white/20">v1.0.0</p>
      </div>
    </aside>
  );
}
