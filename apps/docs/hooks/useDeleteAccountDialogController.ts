'use client';

import { useState } from 'react';

interface UseDeleteAccountDialogControllerParams {
    onDelete: (confirmText: string) => Promise<boolean>;
}

export function useDeleteAccountDialogController({ onDelete }: UseDeleteAccountDialogControllerParams) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const openDeleteDialog = () => {
        setDeleteConfirmText('');
        setDeleteOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteOpen(false);
    };

    const canConfirmDelete = deleteConfirmText.trim() === 'DELETE';

    const confirmDelete = async () => {
        const deleted = await onDelete(deleteConfirmText);
        if (deleted) {
            setDeleteOpen(false);
        }
    };

    return {
        deleteOpen,
        setDeleteOpen,
        deleteConfirmText,
        setDeleteConfirmText,
        canConfirmDelete,
        openDeleteDialog,
        closeDeleteDialog,
        confirmDelete,
    };
}