import "./globals.css";
import type { Metadata } from "next";
import { StoreProvider } from "@repo/store";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast-provider";
import { PushNotificationManager } from "@/components/PushNotificationManager";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <ToastProvider>
                {children}
                <PushNotificationManager />
                <Toaster richColors position="bottom-right" />
              </ToastProvider>
            </TooltipProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
