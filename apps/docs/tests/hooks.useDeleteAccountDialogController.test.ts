import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeleteAccountDialogController } from '../hooks/useDeleteAccountDialogController';

describe('useDeleteAccountDialogController', () => {
    const makeOnDelete = (returns = true) =>
        vi.fn<(text: string) => Promise<boolean>>().mockResolvedValue(returns);

    it('starts with the dialog closed and empty confirm text', () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete() })
        );
        expect(result.current.deleteOpen).toBe(false);
        expect(result.current.deleteConfirmText).toBe('');
    });

    it('openDeleteDialog sets deleteOpen to true', () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete() })
        );
        act(() => result.current.openDeleteDialog());
        expect(result.current.deleteOpen).toBe(true);
    });

    it('openDeleteDialog resets confirm text to empty', () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete() })
        );
        act(() => {
            result.current.setDeleteConfirmText('DELETE');
            result.current.openDeleteDialog();
        });
        expect(result.current.deleteConfirmText).toBe('');
    });

    it('closeDeleteDialog sets deleteOpen to false', () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete() })
        );
        act(() => result.current.openDeleteDialog());
        act(() => result.current.closeDeleteDialog());
        expect(result.current.deleteOpen).toBe(false);
    });

    it('canConfirmDelete is false unless text is exactly "DELETE"', () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete() })
        );
        expect(result.current.canConfirmDelete).toBe(false);

        act(() => result.current.setDeleteConfirmText('delete'));
        expect(result.current.canConfirmDelete).toBe(false);

        act(() => result.current.setDeleteConfirmText('DELETE '));
        expect(result.current.canConfirmDelete).toBe(true); // trim is applied

        act(() => result.current.setDeleteConfirmText('DELETE'));
        expect(result.current.canConfirmDelete).toBe(true);
    });

    it('confirmDelete calls onDelete with the current confirm text', async () => {
        const onDelete = makeOnDelete(true);
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete })
        );
        act(() => {
            result.current.openDeleteDialog();
            result.current.setDeleteConfirmText('DELETE');
        });
        await act(async () => {
            await result.current.confirmDelete();
        });
        expect(onDelete).toHaveBeenCalledWith('DELETE');
    });

    it('closes dialog after successful deletion', async () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete(true) })
        );
        act(() => {
            result.current.openDeleteDialog();
            result.current.setDeleteConfirmText('DELETE');
        });
        await act(async () => {
            await result.current.confirmDelete();
        });
        expect(result.current.deleteOpen).toBe(false);
    });

    it('keeps dialog open when onDelete returns false', async () => {
        const { result } = renderHook(() =>
            useDeleteAccountDialogController({ onDelete: makeOnDelete(false) })
        );
        act(() => {
            result.current.openDeleteDialog();
            result.current.setDeleteConfirmText('DELETE');
        });
        await act(async () => {
            await result.current.confirmDelete();
        });
        expect(result.current.deleteOpen).toBe(true);
    });
});
