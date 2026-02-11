import "./globals.css";
import type { Metadata } from "next";
import { StoreProvider } from "@repo/store";

import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata: Metadata = {
  title: "Student Activity Tracker",
  description: "Frictionless task management for students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>
          <ToastProvider>{children}</ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
