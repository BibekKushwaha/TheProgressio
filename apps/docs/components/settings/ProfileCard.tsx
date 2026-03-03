"use client";

import { User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAccountSettingsController } from "@/hooks/useAccountSettingsController";
import { useDeleteAccountDialogController } from "@/hooks/useDeleteAccountDialogController";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProfileCard() {
    const {
        user,
        isUpdating,
        isExporting,
        isDeleting,
        profileFields,
        setProfileFields,
        handleProfileUpdate,
        handleExport,
        handleDeleteAccount,
    } = useAccountSettingsController();

    const {
        deleteOpen,
        setDeleteOpen,
        deleteConfirmText,
        setDeleteConfirmText,
        canConfirmDelete,
        openDeleteDialog,
        closeDeleteDialog,
        confirmDelete,
    } = useDeleteAccountDialogController({ onDelete: handleDeleteAccount });

    return (
        <>
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Profile Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-3xl font-bold uppercase shrink-0">
                            {user?.username?.[0] || "U"}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="text-xl font-bold">{user?.username}</div>
                            <div className="text-slate-400">{user?.email}</div>
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={profileFields.username}
                                onChange={(e) => setProfileFields(prev => ({ ...prev, username: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileFields.email}
                                onChange={(e) => setProfileFields(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>

                        <Button
                            onClick={handleProfileUpdate}
                            disabled={isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto lg:text-center"
                        >
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data & Privacy section bundled here so the delete dialog shares the same hook instance */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-emerald-400" />
                        <CardTitle>Data & Privacy</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <Button
                            variant="outline"
                            className="border-white/10 hover:bg-white/5"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? "Exporting..." : "Export My Data (JSON)"}
                        </Button>

                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={openDeleteDialog}
                        >
                            Delete Account
                        </Button>
                    </div>

                    <p className="text-xs text-slate-500">
                        Deleting your account permanently removes your data from this deployment.
                    </p>
                </CardContent>
            </Card>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400">
                            This action is irreversible. Type <span className="font-mono text-slate-200">DELETE</span> to confirm.
                        </p>
                        <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="bg-black/30 border-white/10"
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="border-white/10 hover:bg-white/5"
                            onClick={closeDeleteDialog}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting || !canConfirmDelete}
                            onClick={confirmDelete}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
