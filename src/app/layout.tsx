import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "EmailPlatform",
  description: "Event-driven email automation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#f8f9fb]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 ml-[220px]">
          <main className="flex-1 p-8 max-w-[1100px] w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
