import "./globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { StoreProvider } from "@repo/store";

import { ToastProvider } from "@/components/ui/toast-provider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Transition",
    template: "%s | Transition",
  },
  description: "AI-powered student operating system for tasks, habits, calendar, analytics, and exam prep.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} antialiased bg-slate-950 text-slate-100`}>
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
