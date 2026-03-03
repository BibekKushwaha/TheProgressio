"use client"

import { useState } from "react"
import { MoreVertical, Pencil, RefreshCw, Trash2, BarChart2 } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Habit, useDeleteHabitMutation, useResetHabitMutation } from "@repo/store"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import HabitDialog from "./HabitDialog"
import { HabitStatsModal } from "./HabitStatsModal";
import { toast } from "sonner";

type ModalState = "edit" | "stats" | "delete" | "reset" | null;

interface HabitActionMenuProps {
    habit: Habit
}

export function HabitActionMenu({ habit }: HabitActionMenuProps) {
    const [activeModal, setActiveModal] = useState<ModalState>(null);

    const [deleteHabit] = useDeleteHabitMutation()
    const [resetHabit] = useResetHabitMutation()

    const handleDelete = async () => {
        try {
            await deleteHabit(habit.id).unwrap();
        } catch {
            toast.error("Failed to delete habit");
        }
    }

    const handleReset = async () => {
        try {
            await resetHabit(habit.id).unwrap();
        } catch {
            toast.error("Failed to reset habit progress");
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                    <div className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-white/10 text-slate-200">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => setActiveModal("edit")} className="cursor-pointer focus:bg-white/10 focus:text-white">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveModal("stats")} className="cursor-pointer focus:bg-white/10 focus:text-white">
                        <BarChart2 className="mr-2 h-4 w-4" />
                        Stats
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveModal("reset")} className="cursor-pointer focus:bg-white/10 focus:text-white">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => setActiveModal("delete")} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Lazy-mounted modals — only rendered when actually open */}
            {activeModal === "edit" && (
                <HabitDialog
                    open
                    onOpenChange={(open) => !open && setActiveModal(null)}
                    habit={habit}
                />
            )}

            {activeModal === "stats" && (
                <HabitStatsModal
                    open
                    onOpenChange={(open) => !open && setActiveModal(null)}
                    habitId={habit.id}
                />
            )}

            {activeModal === "delete" && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setActiveModal(null)}
                    title="Delete Habit"
                    description="Are you sure you want to delete this habit? This action cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={handleDelete}
                />
            )}

            {activeModal === "reset" && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setActiveModal(null)}
                    title="Reset Habit Progress"
                    description="Are you sure you want to reset this habit's progress? This action cannot be undone."
                    confirmLabel="Reset"
                    variant="default"
                    onConfirm={handleReset}
                />
            )}
        </>
    )
}
