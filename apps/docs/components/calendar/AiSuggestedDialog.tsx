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
// import { Field, FieldGroup } from "@/components/ui/field" // removing unused/complex for now
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "../ui/slider"


import { useRouter } from 'next/navigation';
import { useGetTasksQuery, TaskStatus } from '@repo/store';

import { useState } from "react";

export function AiSuggestedDialog() {
    const router = useRouter();
    const { data: tasks, isLoading } = useGetTasksQuery({ status: TaskStatus.PENDING });
    const [selectedFocusGoal, setSelectedFocusGoal] = useState("");

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        const focusGoal = selectedFocusGoal || 'Study Session';
        router.push(`/focus-session?goal=${encodeURIComponent(focusGoal)}&duration=45`);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 text-white border-0">
                    <span className="w-5 h-5">✨</span> {/* Sparkles icon placeholder */}
                    Suggest Study Blocks
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm bg-slate-900 border-white/10 text-white">
                <form onSubmit={handleGenerate}>
                    <DialogHeader>
                        <DialogTitle>Configure AI Study Blocks</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Let AI find the perfect time for your deep work based on your habits.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="focusGoal" className="text-sm font-medium text-slate-300 mb-2 block">Focus Goal</Label>
                            <Select value={selectedFocusGoal} onValueChange={setSelectedFocusGoal}>
                                <SelectTrigger id="focusGoal" className="bg-slate-900 border-white/10 text-white">
                                    <SelectValue placeholder="Select a task" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {isLoading ? (
                                        <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                                    ) : (
                                        tasks?.map(task => (
                                            <SelectItem key={task.id} value={task.title}>
                                                {task.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* SessionLengthSelector placeholder */}
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-slate-300 mb-2 block">Intensity</Label>
                            <Slider
                                defaultValue={[75]}
                                max={100}
                                step={1}
                                className="flex-1"
                            />
                        </div>
                        {/* SmartConstraints placeholder */}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Generate and Apply</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
