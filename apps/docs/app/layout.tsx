import "./globals.css";
import type { Metadata } from "next";
import { StoreProvider } from "@repo/store";

import { ToastProvider } from "@/components/ui/toast-provider";

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
<<<<<<< HEAD
    <html lang="en" className="dark">
      <body className={`${geist.className} antialiased bg-slate-950 text-slate-100`}>
=======
    <html lang="en">
      <body className="antialiased">
>>>>>>> origin/main
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
