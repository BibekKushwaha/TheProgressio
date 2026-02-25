import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { StoreProvider } from "@repo/store";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PushNotificationManager } from "@/components/PushNotificationManager";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Student Activity Tracker",
    template: "%s | Student Activity Tracker",
  },
  description:
    "Frictionless task management for students — habits, planner, analytics, and focus sessions in one place.",
  keywords: ["student", "planner", "habits", "tasks", "focus", "productivity"],
  authors: [{ name: "Student Activity Tracker" }],
  openGraph: {
    type: "website",
    siteName: "Student Activity Tracker",
    title: "Student Activity Tracker",
    description:
      "Frictionless task management for students — habits, planner, analytics, and focus sessions in one place.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Student Activity Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Activity Tracker",
    description:
      "Frictionless task management for students — habits, planner, analytics, and focus sessions in one place.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-sans">
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
                {children}
                <PushNotificationManager />
                <Toaster richColors position="bottom-right" />
              </TooltipProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
