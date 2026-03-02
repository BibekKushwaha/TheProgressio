"use client";

import { useState } from "react";
import {
    Monitor,
    Smartphone,
    Globe,
    Trash2,
    LogOut,
    Shield,
    RefreshCw,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    useListSessionsQuery,
    useRevokeSessionMutation,
    useLogoutAllDevicesMutation,
    type SessionInfo,
} from "@repo/store";

// ── helpers ────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null): string {
    if (!dateStr) return "never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    const hrs = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
}

function getDeviceIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes("mobile") || n.includes("android") || n.includes("iphone") || n.includes("ios")) {
        return <Smartphone className="w-5 h-5 text-blue-400 shrink-0" />;
    }
    if (n.includes("web") || n.includes("browser") || n.includes("chrome") || n.includes("safari") || n.includes("firefox")) {
        return <Globe className="w-5 h-5 text-purple-400 shrink-0" />;
    }
    return <Monitor className="w-5 h-5 text-emerald-400 shrink-0" />;
}

// ── session row ────────────────────────────────────────────────────────────

function SessionRow({
    session,
    onRevoke,
    isRevoking,
}: {
    session: SessionInfo;
    onRevoke: (id: string) => void;
    isRevoking: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-start gap-3 min-w-0">
                {getDeviceIcon(session.deviceName)}
                <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                            {session.deviceName}
                        </span>
                        {session.isCurrentSession && (
                            <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                This device
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">
                        {session.ipHint ? `IP •••${session.ipHint}` : "Unknown IP"} &middot; Last active {formatRelative(session.lastSeenAt ?? session.createdAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                        Signed in {formatRelative(session.createdAt)}
                    </p>
                </div>
            </div>
            {!session.isCurrentSession && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"
                    disabled={isRevoking}
                    onClick={() => onRevoke(session.id)}
                    aria-label={`Revoke session on ${session.deviceName}`}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}

// ── loading skeleton ───────────────────────────────────────────────────────

function SessionsSkeleton() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                    <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── main component ─────────────────────────────────────────────────────────

export function ActiveSessions() {
    const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

    const { data, isLoading, isFetching, refetch } = useListSessionsQuery();
    const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
    const [logoutAllDevices, { isLoading: isLoggingOutAll }] = useLogoutAllDevicesMutation();

    const sessions = data?.sessions ?? [];

    async function handleRevoke(id: string) {
        try {
            await revokeSession(id).unwrap();
            toast.success("Session revoked");
        } catch {
            toast.error("Failed to revoke session");
        }
    }

    async function handleLogoutAll() {
        try {
            const result = await logoutAllDevices().unwrap();
            toast.success(`Signed out of ${result.count} device(s)`);
            setConfirmLogoutAll(false);
        } catch {
            toast.error("Failed to sign out of all devices");
            setConfirmLogoutAll(false);
        }
    }

    return (
        <>
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <CardTitle>Active Sessions</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white"
                            onClick={() => refetch()}
                            disabled={isLoading || isFetching}
                            aria-label="Refresh sessions"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage where you&apos;re signed in. Revoke access from unfamiliar devices.
                    </p>
                </CardHeader>

                <CardContent className="space-y-4">
                    {isLoading ? (
                        <SessionsSkeleton />
                    ) : sessions.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-6">
                            No active sessions found.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((s) => (
                                <SessionRow
                                    key={s.id}
                                    session={s}
                                    onRevoke={handleRevoke}
                                    isRevoking={isRevoking}
                                />
                            ))}
                        </div>
                    )}

                    {sessions.length > 0 && (
                        <>
                            <Separator className="bg-white/5" />
                            <Button
                                variant="outline"
                                className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/50"
                                onClick={() => setConfirmLogoutAll(true)}
                                disabled={isLoggingOutAll}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign out of all devices
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Confirm logout-all dialog */}
            <Dialog open={confirmLogoutAll} onOpenChange={setConfirmLogoutAll}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sign out everywhere?</DialogTitle>
                        <DialogDescription>
                            This will immediately revoke all active sessions across every device, including this one. You will be redirected to the login page.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmLogoutAll(false)}
                            disabled={isLoggingOutAll}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleLogoutAll}
                            disabled={isLoggingOutAll}
                        >
                            {isLoggingOutAll ? "Signing out…" : "Sign out everywhere"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
