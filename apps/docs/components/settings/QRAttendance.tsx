'use client';

import { useState, useMemo } from 'react';
import { QrCode, RefreshCw, Calendar, CheckCircle, Clock, Download } from 'lucide-react';

interface AttendanceEntry {
    date: string;
    time: string;
    status: 'present' | 'absent' | 'late';
    method: 'QR' | 'manual';
}

// Generate mock attendance for last 7 days
function generateMockAttendance(): AttendanceEntry[] {
    const entries: AttendanceEntry[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (!isWeekend) {
            const statuses: AttendanceEntry['status'][] = ['present', 'present', 'present', 'late', 'present'];
            entries.push({
                date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
                time: `${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
                status: i === 3 ? 'absent' : statuses[i % statuses.length]!,
                method: i === 3 ? 'manual' : 'QR',
            });
        }
    }
    return entries;
}

export function QRAttendance() {
    const [qrCode, setQrCode] = useState<string>(() => {
        return `STU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    });

    const attendance = useMemo(generateMockAttendance, []);
    const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const totalCount = attendance.length;
    const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    const regenerateQR = () => {
        setQrCode(`STU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
    };

    const statusColors = {
        present: 'bg-green-500/20 text-green-400',
        absent: 'bg-red-500/20 text-red-400',
        late: 'bg-yellow-500/20 text-yellow-400',
    };

    return (
        <div className="space-y-6">
            {/* QR Digital ID */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-3 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-4">
                        {/* QR Code Placeholder — uses a text-based visual */}
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 p-4">
                            <QrCode className="w-16 h-16 text-white" />
                            <span className="text-xs text-white/70 font-mono text-center break-all">{qrCode}</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-white">Student Digital ID</p>
                        <p className="text-xs text-slate-400 font-mono">{qrCode}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={regenerateQR}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                        <button className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-1">
                            <Download className="w-3 h-3" /> Save
                        </button>
                    </div>
                </div>

                {/* Attendance Summary */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-400" />
                            This Week&apos;s Attendance
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${attendancePct >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {attendancePct}%
                        </span>
                    </div>

                    <div className="space-y-2">
                        {attendance.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {entry.status === 'present' ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : entry.status === 'late' ? (
                                        <Clock className="w-4 h-4 text-yellow-400" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-red-400" />
                                    )}
                                    <span className="text-sm text-white">{entry.date}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {entry.status !== 'absent' && (
                                        <span className="text-xs text-slate-400 font-mono">{entry.time}</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusColors[entry.status]}`}>
                                        {entry.status}
                                    </span>
                                    <span className="text-xs text-slate-500">{entry.method}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {attendancePct < 75 && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            ⚠️ Attendance below 75%. You may face eligibility issues — attend regularly!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
