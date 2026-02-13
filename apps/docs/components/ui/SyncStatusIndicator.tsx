'use client';

import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSyncStatus } from '@repo/store';

export function SyncStatusIndicator() {
    const { status, pendingCount } = useSyncStatus();

    if (status === 'syncing') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20" title="Syncing local changes">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                {pendingCount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-300 hidden sm:inline">{pendingCount}</span>
                )}
            </div>
        );
    }

    if (status === 'offline') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20" title="Offline: changes stay local until reconnect">
                <CloudOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px] font-semibold text-red-400 hidden sm:inline">Offline</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20" title="Some changes are queued for retry">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                {pendingCount > 0 && (
                    <span className="text-[10px] font-semibold text-orange-300 hidden sm:inline">{pendingCount} queued</span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20" title="Synced">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-green-400" />
            {pendingCount > 0 && (
                <span className="text-[10px] font-semibold text-green-300 hidden sm:inline">{pendingCount}</span>
            )}
        </div>
    );
}
