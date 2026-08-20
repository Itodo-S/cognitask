import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "CogniTask — AI-Powered Todo",
  description: "Intelligent task decomposition and management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-paper-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen lg:ml-64">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
              {children}
            </div>
          </main>
          <MobileNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
