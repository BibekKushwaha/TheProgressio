"use client";

import { usePathname } from "next/navigation";
import { StoreProvider } from "@repo/store";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ErrorMonitorBootstrap } from '@/components/providers/ErrorMonitorBootstrap';

import { CommandPalette } from "@/components/layout/CommandPalette";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password")
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const disableAuthHydrator = isAuthRoute(pathname);

  return (
    <StoreProvider disableAuthHydrator={disableAuthHydrator}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <ErrorMonitorBootstrap />
          {children}
          <Toaster richColors position="bottom-right" />
          {!disableAuthHydrator && <CommandPalette />}
        </TooltipProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}

