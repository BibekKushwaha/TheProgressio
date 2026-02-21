'use client';

import { useState, useMemo, useEffect } from 'react';
import { QrCode, RefreshCw, Calendar, CheckCircle, Download, MapPin, Zap } from 'lucide-react';
import {
    useTriggerGeofencePingMutation,
    useMarkAttendanceMutation,
    useGetAttendanceHistoryQuery,
    useAppSelector
} from '@repo/store';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';



export function QRAttendance() {
    const user = useAppSelector((state) => state.auth.user);
    const userId = user?.id || 'ANON';

    const [qrCode, setQrCode] = useState<string>(() => {
        return `STU-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    });

    useEffect(() => {
        if (user?.id) {
            setQrCode(`STU-${user.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
        }
    }, [user?.id]);

    const { data: historyData, isLoading: isHistoryLoading } = useGetAttendanceHistoryQuery();
    const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();
    const [triggerPing] = useTriggerGeofencePingMutation();

    const attendanceEntries = useMemo(() => {
        if (!historyData?.history) return [];
        return historyData.history.map((entry: { id: string; date: string; status: string; method: string; location?: string }) => ({
            id: entry.id,
            date: new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
            time: new Date(entry.date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
            status: entry.status as 'PRESENT' | 'ABSENT' | 'LATE',
            method: entry.method as 'QR' | 'MANUAL' | 'GEOFENCE',
            location: entry.location
        }));
    }, [historyData]);

    const handleMarkAttendance = async () => {
        try {
            await markAttendance({
                qrCode,
                status: 'PRESENT',
                method: 'QR',
                location: 'Campus'
            }).unwrap();
            toast.success("Attendance marked via QR!");
            setQrCode(`STU-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
        } catch (_error) {
            toast.error("Failed to mark attendance");
        }
    };

    const handleGeofencePing = async (placeType: 'CAMPUS' | 'LIBRARY' | 'HOME' | 'COACHING_CENTER') => {
        try {
            await triggerPing({
                placeType,
                motionState: 'STATIONARY',
                brightness: 0.8
            }).unwrap();
            toast.success(`${placeType} context triggered!`);
        } catch (_error) {
            toast.error("Failed to trigger context");
        }
    };

    const attendancePct = useMemo(() => {
        if (attendanceEntries.length === 0) return 0;
        const present = attendanceEntries.filter(e => e.status === 'PRESENT' || e.status === 'LATE').length;
        return Math.round((present / attendanceEntries.length) * 100);
    }, [attendanceEntries]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
                <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                            <QrCode className="w-5 h-5 text-indigo-400" />
                            <span className="font-bold uppercase tracking-wider text-xs">Student Digital ID</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQrCode(`STU-${userId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`)}
                            className="text-slate-400 hover:text-white h-8"
                        >
                            <RefreshCw className={`w-3 h-3 mr-2 ${isMarking ? 'animate-spin' : ''}`} />
                            Regenerate
                        </Button>
                    </div>

                    <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-lg border border-indigo-500/20">
                        <div className="w-40 h-40 bg-white p-3 rounded-lg flex items-center justify-center mb-4 relative shadow-lg">
                            <QrCode className="w-32 h-32 text-slate-900" />
                        </div>
                        <div className="text-xl font-mono font-bold tracking-[0.2em] text-white">
                            {qrCode}
                        </div>
                    </div>

                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
                        onClick={handleMarkAttendance}
                        disabled={isMarking}
                    >
                        {isMarking ? "Marking..." : "Simulate QR Scan"}
                    </Button>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-xs">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            Geofence Pulse
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${attendancePct >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {attendancePct}% Score
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-2">
                        {(['CAMPUS', 'LIBRARY', 'HOME', 'COACHING_CENTER'] as const).map((place) => (
                            <Button
                                key={place}
                                variant="outline"
                                size="sm"
                                onClick={() => handleGeofencePing(place)}
                                className="flex items-center justify-start gap-3 py-6 border-white/5 bg-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-slate-300"
                            >
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <span className="text-[10px] font-bold uppercase truncate">{place.replace('_', ' ')}</span>
                            </Button>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed italic">
                        Real-time presence shifts affect your notification intelligence window and focus score depth.
                    </p>
                </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Attendance History
                    </div>
                    <Button variant="link" className="text-[10px] text-indigo-400 hover:text-indigo-300 h-auto p-0 uppercase font-bold tracking-tighter">
                        Download Report <Download className="w-3 h-3 ml-1" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {isHistoryLoading ? (
                        Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                    ) : (
                        attendanceEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-1.5 rounded-full ${entry.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : entry.status === 'LATE' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-white">{entry.date}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{entry.time} · {entry.location}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 font-medium tracking-tighter uppercase">{entry.method}</span>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${entry.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : entry.status === 'LATE' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {entry.status}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!isHistoryLoading && attendanceEntries.length === 0 && (
                    <div className="py-12 border border-dashed border-white/10 rounded-xl text-center">
                        <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <div className="text-sm text-slate-500">No attendance records found</div>
                    </div>
                )}
            </div>
        </div>
    );
}

