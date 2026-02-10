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

export function RotationManager() {
    const { data: patternsData, isLoading } = useGetRotationPatternsQuery();
    const { data: todayRotation } = useResolveRotationQuery();
    const [createPattern] = useCreateRotationPatternMutation();
    const [updatePattern] = useUpdateRotationPatternMutation();
    const [deletePattern] = useDeleteRotationPatternMutation();
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState<RotationPattern | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        pattern: '',
        startDate: '',
        cycleLengthDays: '',
    });

    const patterns = patternsData || [];

    const resetForm = () => {
        setFormData({ name: '', pattern: '', startDate: '', cycleLengthDays: '' });
        setEditingPattern(null);
    };

    const handleCreate = async () => {
        try {
            const patternArray = formData.pattern.split(',').map(p => p.trim()).filter(Boolean);
            await createPattern({
                name: formData.name,
                pattern: patternArray,
                startDate: formData.startDate,
                cycleLengthDays: formData.cycleLengthDays ? parseInt(formData.cycleLengthDays) : undefined,
            }).unwrap();

            toast('Rotation pattern created successfully!', 'success');
            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            toast('Failed to create rotation pattern', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editingPattern) return;

        try {
            const patternArray = formData.pattern.split(',').map(p => p.trim()).filter(Boolean);
            await updatePattern({
                id: editingPattern.id,
                name: formData.name || undefined,
                pattern: patternArray.length > 0 ? patternArray : undefined,
                startDate: formData.startDate || undefined,
                cycleLengthDays: formData.cycleLengthDays ? parseInt(formData.cycleLengthDays) : undefined,
            }).unwrap();

            toast('Rotation pattern updated successfully!', 'success');
            setIsEditOpen(false);
            resetForm();
        } catch (error) {
            toast('Failed to update rotation pattern', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rotation pattern?')) return;

        try {
            await deletePattern(id).unwrap();
            toast('Rotation pattern deleted successfully!', 'success');
        } catch (error) {
            toast('Failed to delete rotation pattern', 'error');
        }
    };

    const handleToggleActive = async (pattern: RotationPattern) => {
        try {
            await updatePattern({
                id: pattern.id,
                isActive: !pattern.isActive,
            }).unwrap();

            toast(`Rotation pattern ${!pattern.isActive ? 'activated' : 'deactivated'}!`, 'success');
        } catch (error) {
            toast('Failed to update rotation pattern', 'error');
        }
    };

    const openEditDialog = (pattern: RotationPattern) => {
        setEditingPattern(pattern);
        setFormData({
            name: pattern.name,
            pattern: pattern.pattern.join(', '),
            startDate: pattern.startDate.split('T')[0] ?? '',
            cycleLengthDays: pattern.cycleLengthDays.toString(),
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
            {/* Header with Today's Rotation */}
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
                                    placeholder="Pattern (comma-separated, e.g., A, B, A, B)"
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
                                <Button onClick={handleCreate} className="w-full bg-cyan-500 hover:bg-cyan-600">
                                    Create Pattern
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Today's Rotation */}
                {todayRotation && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Today's Rotation</div>
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

            {/* Rotation Patterns List */}
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
                                    className={`flex-1 ${pattern.isActive
                                        ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    {pattern.isActive ? 'Active' : 'Inactive'}
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
                                    className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                                >
                                    <Trash2 className="w-4 h-4" />
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

            {/* Edit Dialog */}
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
                        <Button onClick={handleUpdate} className="w-full bg-cyan-500 hover:bg-cyan-600">
                            Update Pattern
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
