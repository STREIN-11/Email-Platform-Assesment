import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email Platform",
  description: "Manage email templates and triggers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-indigo-600">EmailPlatform</Link>
          <Link href="/templates" className="text-sm text-gray-600 hover:text-indigo-600">Templates</Link>
          <Link href="/triggers" className="text-sm text-gray-600 hover:text-indigo-600">Triggers</Link>
          <Link href="/playground" className="text-sm text-gray-600 hover:text-indigo-600">Event Playground</Link>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
