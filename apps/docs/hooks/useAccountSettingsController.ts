'use client';

import { useEffect, useState } from 'react';
import {
    useDeleteAccountMutation,
    useLazyExportAccountDataQuery,
    useGetProfileQuery,
    useUpdateProfileMutation,
    User,
} from '@repo/store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { handleMutationError } from '@/lib/api-error';

interface AccountSettingsController {
    user: User | undefined;
    dailyGoalHours: number;
    isProfileLoading: boolean;
    isUpdating: boolean;
    isExporting: boolean;
    isDeleting: boolean;
    profileFields: { username: string; email: string };
    setProfileFields: (value: { username: string; email: string } | ((prev: { username: string; email: string }) => { username: string; email: string })) => void;
    handleDailyGoalChange: (val: string) => Promise<void>;
    handleProfileUpdate: () => Promise<void>;
    handleExport: () => Promise<void>;
    handleDeleteAccount: (confirmText: string) => Promise<boolean>;
}

export function useAccountSettingsController(): AccountSettingsController {
    const router = useRouter();
    const { data: profileData, isLoading: isProfileLoading } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [triggerExport, { isFetching: isExporting }] = useLazyExportAccountDataQuery();
    const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();

    const user = profileData?.user;
    const dailyGoalHours = ((user as { dailyGoalHours?: number } | undefined)?.dailyGoalHours ?? 4);

    const [profileFields, setProfileFields] = useState({
        username: '',
        email: '',
    });

    useEffect(() => {
        if (!user) return;
        setProfileFields({
            username: user.username,
            email: user.email,
        });
    }, [user]);

    const handleDailyGoalChange = async (val: string) => {
        const value = parseFloat(val.split(' ')[0] || '4');
        try {
            await updateProfile({ dailyGoalHours: value }).unwrap();
            toast.success(`Daily goal updated to ${value} hours`);
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to update daily goal');
        }
    };

    const handleProfileUpdate = async () => {
        try {
            await updateProfile(profileFields).unwrap();
            toast.success('Profile updated successfully');
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to update profile');
        }
    };

    const handleExport = async () => {
        try {
            const result = await triggerExport().unwrap();
            const exportedAt = result.export?.exportedAt || new Date().toISOString();
            const filename = `account_export_${exportedAt.slice(0, 10)}.json`;

            const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            toast.success('Export downloaded');
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to export data');
        }
    };

    const handleDeleteAccount = async (confirmText: string) => {
        try {
            await deleteAccount({ confirm: confirmText }).unwrap();
            toast.success('Account deleted');
            router.push('/login');
            return true;
        } catch (error) {
            handleMutationError(error, toast.error, 'Failed to delete account');
            return false;
        }
    };

    return {
        user,
        dailyGoalHours,
        isProfileLoading,
        isUpdating,
        isExporting,
        isDeleting,
        profileFields,
        setProfileFields,
        handleDailyGoalChange,
        handleProfileUpdate,
        handleExport,
        handleDeleteAccount,
    };
}