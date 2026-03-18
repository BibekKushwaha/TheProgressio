import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateHabitMutation, useUpdateHabitMutation, useGetCategoriesQuery, Frequency, Habit } from '@repo/store'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface HabitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    habit?: Habit
}

const EMOJIS = ["✨", "💪", "🏃‍♂️", "🧘‍♂️", "📚", "💧", "🥗", "🍎", "💊", "💤", "💻", "🎸", "🌱", "🎨", "🧹", "🚶‍♂️"]
const COLORS = [
    { name: "Purple", value: "from-purple-600 to-pink-600", bg: "bg-purple-600" },
    { name: "Blue", value: "from-blue-600 to-cyan-600", bg: "bg-blue-600" },
    { name: "Green", value: "from-green-600 to-emerald-600", bg: "bg-green-600" },
    { name: "Orange", value: "from-orange-600 to-yellow-600", bg: "bg-orange-600" },
    { name: "Red", value: "from-red-600 to-rose-600", bg: "bg-red-600" },
    { name: "Indigo", value: "from-indigo-600 to-violet-600", bg: "bg-indigo-600" },
]

const HabitDialog = ({ open, onOpenChange, habit }: HabitDialogProps) => {
    const [habitName, setHabitName] = useState("")
    const [targetValue, setTargetValue] = useState("1")
    const [habitFrequency, setHabitFrequency] = useState<Frequency>(Frequency.DAILY)
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]!)
    const [selectedColor, setSelectedColor] = useState(COLORS[0]!)
    const [linkedCategoryId, setLinkedCategoryId] = useState<string>('none')
    const [reminderTime, setReminderTime] = useState<string>("")
    const [scheduleHint, setScheduleHint] = useState<string>("")
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [createHabit, { isLoading: isCreating }] = useCreateHabitMutation()
    const [updateHabit, { isLoading: isUpdating }] = useUpdateHabitMutation()
    const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !open });

    const isLoading = isCreating || isUpdating

    useEffect(() => {
        if (open) {
            if (habit) {
                setHabitName(habit.name)
                setTargetValue(habit.targetValue.toString())
                setHabitFrequency(habit.frequency)
                setSelectedEmoji(habit.icon || EMOJIS[0]!)
                const color = COLORS.find(c => c.value === habit.color) || COLORS[0]!
                setSelectedColor(color)
                setLinkedCategoryId(habit.linkedCategoryId || 'none')
                setReminderTime(habit.reminderTime ?? "")
                setScheduleHint(habit.reminderTime ? "" : (habit.scheduleHint ?? ""))
            } else {
                setHabitName("")
                setTargetValue("1")
                setHabitFrequency(Frequency.DAILY)
                setSelectedEmoji(EMOJIS[0]!)
                setSelectedColor(COLORS[0]!)
                setLinkedCategoryId('none')
                setReminderTime("")
                setScheduleHint("")
            }
            setErrors({})
        }
    }, [open, habit])

    const onClose = () => {
        onOpenChange(false)
        setErrors({})
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})

        try {
            if (habit) {
                await updateHabit({
                    id: habit.id,
                    name: habitName,
                    frequency: habitFrequency,
                    targetValue: Math.max(1, parseInt(targetValue, 10)) || 1,
                    icon: selectedEmoji,
                    color: selectedColor.value,
                    linkedCategoryId: linkedCategoryId === 'none' ? null : linkedCategoryId,
                    reminderTime: reminderTime ? reminderTime : null,
                    scheduleHint: reminderTime ? null : (scheduleHint ? scheduleHint : null),
                }).unwrap()
            } else {
                await createHabit({
                    name: habitName,
                    frequency: habitFrequency,
                    targetValue: Math.max(1, parseInt(targetValue, 10)) || 1,
                    icon: selectedEmoji,
                    color: selectedColor.value,
                    linkedCategoryId: linkedCategoryId === 'none' ? null : linkedCategoryId,
                    reminderTime: reminderTime ? reminderTime : null,
                    scheduleHint: reminderTime ? null : (scheduleHint ? scheduleHint : null),
                }).unwrap()
            }
            onClose()
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err !== null && 'data' in err
                    ? (err as { data?: { message?: string } }).data?.message
                    : undefined
            setErrors({ form: message || `Failed to ${habit ? 'update' : 'create'} habit` })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10 max-h-[90vh] overflow-y-auto outline-none">
                <form onSubmit={handleFormSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {habit ? "Edit Habit" : "New Habit"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {habit ? "Update your habit details." : "Build consistency and track your progress."}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2 gap-4 mt-4">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Field>
                                    <Label htmlFor="habitName" className="text-slate-300">Habit Name</Label>
                                    <Input
                                        id="habitName"
                                        value={habitName}
                                        onChange={(e) => setHabitName(e.target.value)}
                                        placeholder="e.g. Morning Meditation"
                                        className="bg-white/5 border-white/10 focus:ring-purple-500/50 mt-1"
                                        required
                                    />
                                </Field>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="w-16 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-3xl shrink-0 transition-all hover:bg-white/10 focus:ring-2 focus:ring-purple-500/50 outline-none"
                                    >
                                        {selectedEmoji}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 bg-slate-900 border-white/10 p-3" align="end">
                                    <div className="grid grid-cols-4 gap-2">
                                        {EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setSelectedEmoji(emoji)}
                                                className={cn(
                                                    "w-12 h-12 flex items-center justify-center rounded-xl transition-all text-2xl",
                                                    selectedEmoji === emoji ? "bg-purple-500/20 ring-2 ring-purple-500" : "hover:bg-white/10"
                                                )}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Field>
                            <Label className="text-slate-300">Theme Color</Label>
                            <div className="flex gap-3 mt-2">
                                {COLORS.map(color => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                                            color.bg,
                                            selectedColor.name === color.name ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        {selectedColor.name === color.name && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <Label htmlFor="targetValue" className="text-slate-300">Daily Target</Label>
                                <Input
                                    type="number"
                                    id="targetValue"
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(e.target.value)}
                                    className="bg-white/5 border-white/10 focus:ring-purple-500/50 mt-1"
                                    min="1"
                                    required
                                />
                            </Field>

                            <Field>
                                <Label htmlFor="frequency" className="text-slate-300">Frequency</Label>
                                <select
                                    id="frequency"
                                    value={habitFrequency}
                                    onChange={(e) => setHabitFrequency(e.target.value as Frequency)}
                                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 mt-1"
                                >
                                    <option value={Frequency.DAILY} className="bg-slate-900 border-none">Daily</option>
                                    <option value={Frequency.WEEKLY} className="bg-slate-900 border-none">Weekly</option>
                                </select>
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <Label htmlFor="reminderTime" className="text-slate-300">Reminder Time (Optional)</Label>
                                <Input
                                    type="time"
                                    id="reminderTime"
                                    value={reminderTime}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setReminderTime(value);
                                        if (value) setScheduleHint("");
                                    }}
                                    className="bg-white/5 border-white/10 focus:ring-purple-500/50 mt-1"
                                />
                            </Field>

                            <Field>
                                <Label htmlFor="scheduleHint" className="text-slate-300">Schedule Window (Optional)</Label>
                                <select
                                    id="scheduleHint"
                                    value={scheduleHint}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setScheduleHint(value);
                                        if (value) setReminderTime("");
                                    }}
                                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 mt-1"
                                >
                                    <option value="" className="bg-slate-900">Any time</option>
                                    <option value="morning" className="bg-slate-900">Morning</option>
                                    <option value="afternoon" className="bg-slate-900">Afternoon</option>
                                    <option value="evening" className="bg-slate-900">Evening</option>
                                    <option value="night" className="bg-slate-900">Night</option>
                                </select>
                            </Field>
                        </div>

                        <Field>
                            <Label htmlFor="linkedCategory" className="text-slate-300">Auto-Link Category (Optional)</Label>
                            <select
                                id="linkedCategory"
                                value={linkedCategoryId}
                                onChange={(e) => setLinkedCategoryId(e.target.value)}
                                className="mt-1 flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            >
                                <option value="none" className="bg-slate-900">None</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id} className="bg-slate-900">
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                Completing a task in this category auto-updates this habit streak.
                            </p>
                        </Field>
                    </FieldGroup>

                    {errors.form && <p className="text-red-400 text-sm mb-4">{errors.form}</p>}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5 text-slate-400">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "bg-gradient-to-r hover:opacity-90 transition-opacity",
                                selectedColor.value
                            )}
                        >
                            {isLoading ? (habit ? "Saving..." : "Creating...") : (habit ? "Save Changes" : "Create Habit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default HabitDialog
