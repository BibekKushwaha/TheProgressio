'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

type SyncStatus = 'online' | 'offline' | 'syncing';

export function SyncStatusIndicator() {
    const [status, setStatus] = useState<SyncStatus>('online');

    useEffect(() => {
        const updateOnlineStatus = () => {
            setStatus(navigator.onLine ? 'online' : 'offline');
        };

        // Set initial status
        updateOnlineStatus();

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    if (status === 'online') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20" title="Connected">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <Cloud className="w-3.5 h-3.5 text-green-400" />
            </div>
        );
    }

    if (status === 'syncing') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20" title="Syncing...">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20" title="Offline – changes saved locally">
            <CloudOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-semibold text-red-400 hidden sm:inline">Offline</span>
        </div>
    );
}
