import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { SessionLengthSelector } from "./SessionLengthSelector"
import { Slider } from "../ui/slider"
import { SmartConstraints, type SmartConstraintsValue } from "./SmartConstraints"
import { useRouter } from 'next/navigation';
import { useGetTasksQuery, TaskStatus, Task, ScheduleItem } from '@repo/store';
import { Brain, Clock3, Sparkles, Target } from "lucide-react";
import { toLocalDateKey } from "@/lib/date";

interface AiSuggestedDialogProps {
    date: Date;
    scheduleItems: ScheduleItem[];
}

type TimeBlock = {
    start: number;
    end: number;
};

type SuggestedSlot = {
    start: number;
    end: number;
    reason: string;
};

const DAY_START_MIN = 6 * 60;  // 06:00
const DAY_END_MIN = 22 * 60;   // 22:00
const BREAK_BUFFER_MIN = 15;

const parseHHMM = (value: string): number | null => {
    const [hhStr, mmStr] = value.split(':');
    if (hhStr === undefined || mmStr === undefined) return null;
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
};

const toHHMM = (minutes: number): string => {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const mergeBlocks = (blocks: TimeBlock[]): TimeBlock[] => {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    const merged: TimeBlock[] = [sorted[0]!];

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i]!;
        const last = merged[merged.length - 1]!;

        if (current.start <= last.end) {
            last.end = Math.max(last.end, current.end);
        } else {
            merged.push({ ...current });
        }
    }

    return merged;
};

const computeSuggestedSlot = (params: {
    scheduleItems: ScheduleItem[];
    sessionMinutes: number;
    intensity: number;
    prioritizeMorning: boolean;
    avoidBackToBack: boolean;
}): SuggestedSlot | null => {
    const {
        scheduleItems,
        sessionMinutes,
        intensity,
        prioritizeMorning,
        avoidBackToBack,
    } = params;

    const blockingTypes = new Set<ScheduleItem['type']>(['class', 'exam', 'event']);
    const baseBusyBlocks = scheduleItems
        .filter((item) => blockingTypes.has(item.type))
        .map((item) => {
            const start = parseHHMM(item.startTime);
            const end = parseHHMM(item.endTime);
            if (start === null || end === null || end <= start) return null;
            return {
                start: clamp(start, DAY_START_MIN, DAY_END_MIN),
                end: clamp(end, DAY_START_MIN, DAY_END_MIN),
            };
        })
        .filter((block): block is TimeBlock => block !== null && block.end > block.start);

    const bufferedBusyBlocks = avoidBackToBack
        ? baseBusyBlocks.map((block) => ({
            start: clamp(block.start - BREAK_BUFFER_MIN, DAY_START_MIN, DAY_END_MIN),
            end: clamp(block.end + BREAK_BUFFER_MIN, DAY_START_MIN, DAY_END_MIN),
        }))
        : baseBusyBlocks;

    const mergedBusy = mergeBlocks(bufferedBusyBlocks);

    const freeBlocks: TimeBlock[] = [];
    let cursor = DAY_START_MIN;
    for (const busy of mergedBusy) {
        if (busy.start > cursor) {
            freeBlocks.push({ start: cursor, end: busy.start });
        }
        cursor = Math.max(cursor, busy.end);
    }
    if (cursor < DAY_END_MIN) {
        freeBlocks.push({ start: cursor, end: DAY_END_MIN });
    }

    const viableBlocks = freeBlocks.filter((block) => block.end - block.start >= sessionMinutes);
    if (viableBlocks.length === 0) return null;

    // Candidate = earliest start in each viable block.
    const candidates = viableBlocks.map((block) => {
        const start = block.start;
        const end = start + sessionMinutes;
        const slack = block.end - end;
        const isMorning = start < 12 * 60;
        const isAfternoon = start >= 12 * 60 && start < 17 * 60;
        const isEvening = start >= 17 * 60;

        let score = 0;
        score += Math.min(slack, 120) * 0.2; // more breathing room is slightly better

        if (prioritizeMorning) {
            if (isMorning) score += 40;
            else if (isAfternoon) score += 15;
            else score -= 10;
        } else {
            if (isAfternoon) score += 20;
            else if (isMorning) score += 10;
        }

        // High intensity prefers earlier slots and bigger buffer.
        if (intensity >= 80) {
            if (isMorning) score += 20;
            if (isEvening) score -= 10;
        } else if (intensity <= 40) {
            // Low intensity can tolerate later blocks.
            if (isEvening) score += 10;
        }

        return { start, end, score };
    });

    candidates.sort((a, b) => b.score - a.score || a.start - b.start);
    const best = candidates[0]!;

    const reasonParts: string[] = [];
    if (prioritizeMorning && best.start < 12 * 60) reasonParts.push('morning-priority');
    if (avoidBackToBack) reasonParts.push('break-buffered');
    if (intensity >= 80) reasonParts.push('high-focus window');
    if (reasonParts.length === 0) reasonParts.push('next best free slot');

    return {
        start: best.start,
        end: best.end,
        reason: reasonParts.join(' • '),
    };
};

export function AiSuggestedDialog({ date, scheduleItems }: AiSuggestedDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { data: tasks, isLoading } = useGetTasksQuery({ status: TaskStatus.PENDING });
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [customGoal, setCustomGoal] = useState('');
    const [sessionMinutes, setSessionMinutes] = useState(50);
    const [intensity, setIntensity] = useState(75);
    const [constraints, setConstraints] = useState<SmartConstraintsValue>({
        'avoid-back-to-back': true,
        'prioritize-morning': true,
    });

    const pendingTasks = useMemo(() => {
        if (!tasks) return [] as Task[];
        return [...tasks].sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    }, [tasks]);

    const selectedTask = useMemo(
        () => pendingTasks.find((task) => task.id === selectedTaskId),
        [pendingTasks, selectedTaskId]
    );

    const finalGoal = useMemo(() => {
        if (selectedTask) return selectedTask.title;
        const custom = customGoal.trim();
        return custom || 'Study Session';
    }, [selectedTask, customGoal]);

    const suggestedSlot = useMemo(
        () =>
            computeSuggestedSlot({
                scheduleItems,
                sessionMinutes,
                intensity,
                prioritizeMorning: constraints['prioritize-morning'] ?? true,
                avoidBackToBack: constraints['avoid-back-to-back'] ?? true,
            }),
        [scheduleItems, sessionMinutes, intensity, constraints]
    );

    const suggestionText = suggestedSlot
        ? `${toHHMM(suggestedSlot.start)} - ${toHHMM(suggestedSlot.end)}`
        : 'No free slot found';

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        params.set('goal', finalGoal);
        params.set('task', finalGoal);
        params.set('duration', String(sessionMinutes));
        params.set('intensity', String(intensity));
        params.set('avoidBackToBack', constraints['avoid-back-to-back'] ? '1' : '0');
        params.set('prioritizeMorning', constraints['prioritize-morning'] ? '1' : '0');
        params.set('date', toLocalDateKey(date));

        if (suggestedSlot) {
            params.set('recommendedStart', toHHMM(suggestedSlot.start));
            params.set('recommendedEnd', toHHMM(suggestedSlot.end));
            params.set('suggestionReason', suggestedSlot.reason);
        }

        if (selectedTask) {
            params.set('taskId', selectedTask.id);
        }

        setOpen(false);
        router.push(`/focus-session?${params.toString()}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 text-white border-0">
                    <Sparkles className="w-4 h-4" />
                    Suggest Study Blocks
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl bg-slate-900 border-white/10 text-white">
                <form onSubmit={handleGenerate}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-300" />
                            Configure AI Study Blocks
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Build a focused session plan using your pending work and preferred intensity.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="focusGoal" className="text-sm font-medium text-slate-300 mb-2 block">Focus Goal</Label>
                            <Select
                                name="focusGoal"
                                id="focusGoal"
                                value={selectedTaskId}
                                onChange={(e) => setSelectedTaskId(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            >
                                <option value="" className="bg-slate-900">Custom goal</option>
                                {isLoading ? (
                                    <option value="" disabled className="bg-slate-900">Loading tasks...</option>
                                ) : (
                                    pendingTasks.map(task => (
                                        <option key={task.id} value={task.id} className="bg-slate-900">
                                            {task.title}
                                        </option>
                                    ))
                                )}
                            </Select>
                        </div>

                        {!selectedTaskId && (
                            <div>
                                <Label htmlFor="customGoal" className="text-sm font-medium text-slate-300 mb-2 block">
                                    Custom Goal Title
                                </Label>
                                <Input
                                    id="customGoal"
                                    value={customGoal}
                                    onChange={(e) => setCustomGoal(e.target.value)}
                                    placeholder="e.g., Revise Calculus Chapter 6"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                                />
                            </div>
                        )}

                        <SessionLengthSelector value={sessionMinutes} onChange={setSessionMinutes} />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-slate-300">Intensity</Label>
                                <span className="text-xs text-purple-300 font-semibold">{intensity}%</span>
                            </div>
                            <Slider
                                value={[intensity]}
                                onValueChange={(values) => setIntensity(values[0] ?? 75)}
                                max={100}
                                step={1}
                                className="flex-1"
                            />
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Light</span>
                                <span>Balanced</span>
                                <span>Intense</span>
                            </div>
                        </div>

                        <SmartConstraints value={constraints} onChange={setConstraints} />

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Preview</div>
                            <div className="space-y-1">
                                <p className="text-sm text-white flex items-center gap-2">
                                    <Target className="w-4 h-4 text-cyan-300" />
                                    {finalGoal}
                                </p>
                                <p className="text-sm text-slate-300 flex items-center gap-2">
                                    <Clock3 className="w-4 h-4 text-purple-300" />
                                    {sessionMinutes} min session
                                </p>
                                <p className="text-sm text-slate-300 flex items-center gap-2">
                                    <Clock3 className="w-4 h-4 text-cyan-300" />
                                    Suggested slot: <span className="font-semibold text-white">{suggestionText}</span>
                                </p>
                                {suggestedSlot ? (
                                    <p className="text-[11px] text-slate-500">
                                        Strategy: {suggestedSlot.reason}
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-amber-300/80">
                                        No suitable window found in current schedule. You can still start now.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                            Generate and Apply
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
