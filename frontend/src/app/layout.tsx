import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "CogniTask — pen & paper",
  description: "A notebook for your tasks, with an assistant that reads your handwriting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen">
        <ToastProvider>
          <Sidebar />

          <main className="min-h-screen lg:pl-60">
            <div className="mx-auto max-w-4xl px-3 py-5 pb-24 sm:px-6 lg:px-10 lg:pb-10">
              {/* The open page itself: a punched, ruled sheet on the desk. */}
              <div className="sheet sheet-stack sheet-punched relative rounded-[4px] px-5 py-7 pl-10 sm:px-10 sm:py-9 sm:pl-16">
                {/* Red margin rule down the left, as on real ruled paper. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-4 left-[38px] w-px bg-rule-margin/70 sm:left-[56px]"
                />
                {children}
              </div>
            </div>
          </main>

          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
