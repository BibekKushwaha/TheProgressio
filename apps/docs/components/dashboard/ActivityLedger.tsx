'use client';

import { useMemo } from 'react';
import { useGetAuditLogsQuery, AuditLog } from '@repo/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Flame, Activity, FileText, LucideIcon, Info } from 'lucide-react';
import { EmptyLedgerIllustration } from '../illustrations/EmptyLedgerIllustration';

export function ActivityLedger() {
    const { data: logsData, isLoading } = useGetAuditLogsQuery({ limit: 15, page: 1 });

    const ledgerItems = useMemo(() => {
        type LedgerItem = { id: string; title: string; type: string; date: Date; icon: LucideIcon; color: string };
        if (!logsData?.logs) return [] as LedgerItem[];

        return logsData.logs.map((log: AuditLog) => {
            let icon: LucideIcon = Info;
            let color = 'text-slate-400 bg-slate-500/10';
            let title = `Action: ${log.action}`;

            if (log.entityType === 'TASK') {
                icon = CheckCircle;
                color = 'text-green-400 bg-green-500/10';
                if (log.action === 'TASK_CREATED') title = 'Task Created';
                else if (log.action === 'TASK_UPDATED') title = 'Task Updated';
                else if (log.action === 'TASK_DELETED') title = 'Task Deleted';
                else if (log.action === 'TASK_STATUS_CHANGED') title = 'Task Status Changed';
                else if (log.action === 'TASK_COMPLETED') title = 'Task Completed';

                try {
                    const details = log.details ? JSON.parse(log.details) : null;
                    if (details?.title) title = `${title}: "${details.title}"`;
                } catch { /* ignore */ }
            } else if (log.entityType === 'HABIT') {
                icon = Flame;
                color = 'text-orange-400 bg-orange-500/10';
                if (log.action === 'HABIT_LOGGED') title = 'Habit Logged';
            } else if (log.entityType === 'NOTE') {
                icon = FileText;
                color = 'text-blue-400 bg-blue-500/10';
                if (log.action === 'NOTE_CREATED') title = 'Quick Note Added';
                else if (log.action === 'NOTE_DELETED') title = 'Quick Note Deleted';
            }

            return {
                id: log.id,
                title,
                type: log.entityType,
                date: new Date(log.createdAt),
                icon,
                color
            };
        });
    }, [logsData]);

    if (isLoading) {
        return (
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Audit Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" className="h-full max-h-[500px] overflow-y-auto py-0">
            <CardHeader className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md rounded-t-xl pb-2 border-b border-white/5 ">
                <CardTitle className="flex items-center gap-2 text-white pt-4">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Activity & Audit Ledger
                </CardTitle>
            </CardHeader>
            <CardContent>
                {ledgerItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 mt-4 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                        <EmptyLedgerIllustration className="w-28 h-20 mb-3 text-indigo-500" />
                        <p className="text-sm text-slate-500 font-medium">No recent activity found.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-white/10 ml-3 space-y-6 pb-2">
                        {ledgerItems.map(item => (
                            <div key={item.id} className="relative pl-6 group">
                                <span className={`absolute -left-[14px] top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 transition-transform group-hover:scale-110 ${item.color}`}>
                                    <item.icon className="w-3.5 h-3.5" />
                                </span>
                                <div className="flex flex-col gap-1 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <span className="text-sm text-slate-200 font-medium">{item.title}</span>
                                    <span className="text-xs text-slate-500">{item.date.toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
