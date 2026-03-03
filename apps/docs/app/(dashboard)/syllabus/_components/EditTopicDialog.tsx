'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUpdateSyllabusTopicMutation, type SyllabusTopic } from '@repo/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EditTopicDialogProps {
  editing: SyllabusTopic | null;
  onClose: () => void;
}

export function EditTopicDialog({ editing, onClose }: EditTopicDialogProps) {
  const [updateTopic, { isLoading }] = useUpdateSyllabusTopicMutation();

  const [form, setForm] = useState({ chapter: '', title: '', notes: '' });
  const patch = (p: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...p }));

  // Sync form when a different topic is opened for editing.
  useEffect(() => {
    if (editing) {
      setForm({
        chapter: editing.chapter ?? 'General',
        title: editing.title ?? '',
        notes: editing.notes ?? '',
      });
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      await updateTopic({
        id: editing.id,
        chapter: form.chapter.trim() || 'General',
        title: form.title.trim(),
        notes: form.notes.trim() || null,
      }).unwrap();
      toast.success('Topic updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  }, [editing, form, updateTopic, onClose]);

  return (
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chapter</Label>
            <Input
              value={form.chapter}
              onChange={(e) => patch({ chapter: e.target.value })}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              className="w-full min-h-[100px] rounded-md bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
