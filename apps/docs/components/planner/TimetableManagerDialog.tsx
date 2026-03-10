"use client";

import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClassManager } from './ClassManager';

interface TimetableManagerDialogProps {
    trigger: ReactNode;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function TimetableManagerDialog({
    trigger,
    defaultOpen,
    onOpenChange,
}: TimetableManagerDialogProps) {
    return (
        <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-3xl bg-slate-950 border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        Timetable Manager
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Manage your subjects and weekly class schedule.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-2">
                    <ClassManager />
                </div>
            </DialogContent>
        </Dialog>
    );
}
