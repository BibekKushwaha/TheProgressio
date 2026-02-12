'use client';

import { useState } from 'react';
import {
    useGetRotationPatternsQuery,
    useCreateRotationPatternMutation,
    useUpdateRotationPatternMutation,
    useDeleteRotationPatternMutation,
    useResolveRotationQuery,
    RotationPattern,
} from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { Calendar, Plus, Edit, Trash2, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-error';
import { getTodayDateKey, normalizeDateInput } from '@/lib/date';

const parsePatternLabels = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return [] as string[];

    const byComma = clean.split(',').map((p) => p.trim()).filter(Boolean);
    if (byComma.length >= 2) return byComma;

    const byDash = clean.split('-').map((p) => p.trim()).filter(Boolean);
    if (byDash.length >= 2) return byDash;

    const bySlash = clean.split('/').map((p) => p.trim()).filter(Boolean);
    if (bySlash.length >= 2) return bySlash;

    return byComma;
};

const getInitialFormData = () => ({
    name: '',
    pattern: '',
    startDate: getTodayDateKey(),
    cycleLengthDays: '',
});

export function RotationManager() {
    const { data: patternsData, isLoading } = useGetRotationPatternsQuery();
    const { data: todayRotation } = useResolveRotationQuery();
    const [createPattern, { isLoading: isCreating }] = useCreateRotationPatternMutation();
    const [updatePattern, { isLoading: isUpdating }] = useUpdateRotationPatternMutation();
    const [deletePattern, { isLoading: isDeleting }] = useDeleteRotationPatternMutation();
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState<RotationPattern | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
    const [formData, setFormData] = useState(getInitialFormData);

    const patterns = patternsData || [];

    const resetForm = () => {
        setFormData(getInitialFormData());
        setEditingPattern(null);
    };

    const parseForm = () => {
        const name = formData.name.trim();
        const patternArray = parsePatternLabels(formData.pattern);
        const normalizedStartDate = normalizeDateInput(formData.startDate);
        const cycleLengthDays = formData.cycleLengthDays
            ? parseInt(formData.cycleLengthDays, 10)
            : undefined;

        if (!name) {
            toast('Please enter a pattern name', 'error');
            return null;
        }
        if (!normalizedStartDate) {
            toast('Please select a valid start date (YYYY-MM-DD)', 'error');
            return null;
        }
        if (patternArray.length < 2) {
            toast('Pattern must contain at least 2 labels (e.g., A, B or A-B)', 'error');
            return null;
        }
        if (cycleLengthDays !== undefined && (Number.isNaN(cycleLengthDays) || cycleLengthDays <= 0)) {
            toast('Cycle length must be a positive number', 'error');
            return null;
        }

        return { name, patternArray, cycleLengthDays, startDate: normalizedStartDate };
    };

    const handleCreate = async () => {
        const parsed = parseForm();
        if (!parsed) return;

        try {
            await createPattern({
                name: parsed.name,
                pattern: parsed.patternArray,
                startDate: parsed.startDate,
                cycleLengthDays: parsed.cycleLengthDays,
            }).unwrap();

            toast('Rotation pattern created successfully!', 'success');
            setIsCreateOpen(false);
            resetForm();
        } catch (error: unknown) {
            toast(getApiErrorMessage(error, 'Failed to create rotation pattern'), 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editingPattern) return;
        const parsed = parseForm();
        if (!parsed) return;

        try {
            await updatePattern({
                id: editingPattern.id,
                name: parsed.name,
                pattern: parsed.patternArray,
                startDate: parsed.startDate,
                cycleLengthDays: parsed.cycleLengthDays,
            }).unwrap();

            toast('Rotation pattern updated successfully!', 'success');
            setIsEditOpen(false);
            resetForm();
        } catch (error: unknown) {
            toast(getApiErrorMessage(error, 'Failed to update rotation pattern'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rotation pattern?')) return;

        try {
            setPendingDeleteId(id);
            await deletePattern(id).unwrap();
            toast('Rotation pattern deleted successfully!', 'success');
        } catch (error: unknown) {
            toast(getApiErrorMessage(error, 'Failed to delete rotation pattern'), 'error');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const handleToggleActive = async (pattern: RotationPattern) => {
        try {
            setPendingToggleId(pattern.id);
            await updatePattern({
                id: pattern.id,
                isActive: !pattern.isActive,
            }).unwrap();

            toast(`Rotation pattern ${!pattern.isActive ? 'activated' : 'deactivated'}!`, 'success');
        } catch (error: unknown) {
            toast(getApiErrorMessage(error, 'Failed to update rotation pattern'), 'error');
        } finally {
            setPendingToggleId(null);
        }
    };

    const openEditDialog = (pattern: RotationPattern) => {
        setEditingPattern(pattern);
        setFormData({
            name: pattern.name,
            pattern: pattern.pattern.join(', '),
            startDate: pattern.startDate.split('T')[0] ?? '',
            cycleLengthDays: String(pattern.cycleLengthDays ?? ''),
        });
        setIsEditOpen(true);
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-32 w-full bg-white/5" />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-md border-cyan-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                            <RotateCw className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Rotation Manager</h2>
                            <p className="text-sm text-slate-400">Manage your timetable rotation patterns</p>
                        </div>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-cyan-500 hover:bg-cyan-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Pattern
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Create Rotation Pattern</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Input
                                    placeholder="Pattern Name (e.g., Week A/B)"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    placeholder="Pattern (e.g., A, B or A-B)"
                                    value={formData.pattern}
                                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    type="date"
                                    placeholder="Start Date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <Input
                                    type="number"
                                    placeholder="Cycle Length (days, optional)"
                                    value={formData.cycleLengthDays}
                                    onChange={(e) => setFormData({ ...formData, cycleLengthDays: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <Button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60"
                                >
                                    {isCreating ? 'Creating...' : 'Create Pattern'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {todayRotation && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Today&apos;s Rotation</div>
                                <div className="text-3xl font-bold text-cyan-400">{todayRotation.rotation}</div>
                                {todayRotation.pattern && (
                                    <div className="text-xs text-slate-500 mt-1">{todayRotation.pattern.name}</div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 mb-1">Source</div>
                                <div className="text-sm text-slate-300 capitalize">
                                    {todayRotation.source.replace('-', ' ')}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {patterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patterns.map((pattern) => (
                        <Card key={pattern.id} className="bg-white/5 backdrop-blur-md border-white/10 p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-white">{pattern.name}</h3>
                                        {pattern.isActive ? (
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {pattern.pattern.map((label, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-semibold"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="space-y-1 text-xs text-slate-400">
                                        <div>Start: {new Date(pattern.startDate).toLocaleDateString()}</div>
                                        <div>Cycle: {pattern.cycleLengthDays} days</div>
                                        <div>Created: {new Date(pattern.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleActive(pattern)}
                                    disabled={isUpdating && pendingToggleId === pattern.id}
                                    className={`flex-1 ${pattern.isActive
                                        ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    {isUpdating && pendingToggleId === pattern.id
                                        ? 'Updating...'
                                        : (pattern.isActive ? 'Active' : 'Inactive')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(pattern)}
                                    className="bg-white/5 border-white/10 hover:bg-white/10"
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(pattern.id)}
                                    disabled={(isDeleting && pendingDeleteId === pattern.id) || isUpdating}
                                    className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                                >
                                    {isDeleting && pendingDeleteId === pattern.id ? '...' : <Trash2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-white/5 backdrop-blur-md border-white/10 p-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No rotation patterns yet. Create your first pattern to get started!</p>
                </Card>
            )}

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Rotation Pattern</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Pattern Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-white/5 border-white/10"
                        />
                        <Input
                            placeholder="Pattern (comma-separated)"
                            value={formData.pattern}
                            onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                            className="bg-white/5 border-white/10"
                        />
                        <Input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="bg-white/5 border-white/10"
                        />
                        <Input
                            type="number"
                            placeholder="Cycle Length (days)"
                            value={formData.cycleLengthDays}
                            onChange={(e) => setFormData({ ...formData, cycleLengthDays: e.target.value })}
                            className="bg-white/5 border-white/10"
                        />
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60"
                        >
                            {isUpdating ? 'Updating...' : 'Update Pattern'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
