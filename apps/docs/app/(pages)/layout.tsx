"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";

export default function PagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard>{children}</AuthGuard>;
}
