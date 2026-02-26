'use client';

import React, { useState } from 'react';
import { Share2, Trash2, Copy, Check, Clock, Shield, Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import {
    useGetFamilyLinksQuery,
    useCreateFamilyLinkMutation,
    useRevokeFamilyLinkMutation,
    useGetMentorAlertSubscriptionsQuery,
    useCreateMentorAlertSubscriptionMutation,
    useUpdateMentorAlertSubscriptionMutation,
    useRevokeMentorAlertSubscriptionMutation,
    useGetMentorFeedbackQuery,
} from '@repo/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function FamilyShareManagement() {
    const { data, isLoading } = useGetFamilyLinksQuery();
    const [createLink, { isLoading: isCreating }] = useCreateFamilyLinkMutation();
    const [revokeLink, { isLoading: isRevoking }] = useRevokeFamilyLinkMutation();

    const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useGetMentorAlertSubscriptionsQuery();
    const [createSub, { isLoading: isCreatingSub }] = useCreateMentorAlertSubscriptionMutation();
    const [updateSub, { isLoading: isUpdatingSub }] = useUpdateMentorAlertSubscriptionMutation();
    const [revokeSub, { isLoading: isRevokingSub }] = useRevokeMentorAlertSubscriptionMutation();
    const { data: feedbackData, isLoading: feedbackLoading } = useGetMentorFeedbackQuery();

    const [label, setLabel] = useState('');
    const [permissions, setPermissions] = useState('READ_ONLY');
    const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
    const [expiresInDays, setExpiresInDays] = useState('14');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [subLabel, setSubLabel] = useState('');
    const [subPhone, setSubPhone] = useState('');
    const [subOverdue, setSubOverdue] = useState('5');
    const [subConsistency, setSubConsistency] = useState('50');
    const [subCooldown, setSubCooldown] = useState('360');
    const [pendingRevokeSubId, setPendingRevokeSubId] = useState<string | null>(null);

    const handleCreate = async () => {
        try {
            const result = await createLink({
                label: label.trim() || undefined,
                permissions,
                expiresInDays: parseInt(expiresInDays),
            }).unwrap();

            toast.success('Family share link created');
            setLabel('');
            // Copy the new link to clipboard automatically
            const shareUrl = `${window.location.origin}/family-connect/accept/${result.shareToken}`;
            navigator.clipboard.writeText(shareUrl);
            toast.info('Link copied to clipboard!');
        } catch (error) {
            console.error('Failed to create share link:', error);
            toast.error('Failed to create share link');
        }
    };

    const handleRevoke = (id: string) => {
        setPendingRevokeId(id);
    };

    const performRevoke = async () => {
        if (!pendingRevokeId) return;
        try {
            await revokeLink(pendingRevokeId).unwrap();
            toast.success('Share link revoked');
        } catch (error) {
            console.error('Failed to revoke share link:', error);
            toast.error('Failed to revoke share link');
        } finally {
            setPendingRevokeId(null);
        }
    };

    const copyToClipboard = (token: string, id: string) => {
        const shareUrl = `${window.location.origin}/family-connect/accept/${token}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(id);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const links = data?.links || [];
    const subs = subsData?.subscriptions || [];
    const feedback = feedbackData?.feedback || [];

    return (
        <>
            <Card variant="glass" className="overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-indigo-400" />
                        <div>
                            <CardTitle>Family &amp; Mentor Sharing</CardTitle>
                            <CardDescription>Generate read-only links to share your progress with parents or mentors.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Create New Link */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="share-label">Recipient Label (Optional)</Label>
                                <Input
                                    id="share-label"
                                    placeholder="e.g. Mom, Dad, Coach"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="share-permissions">Permissions</Label>
                                <Select value={permissions} onValueChange={setPermissions}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="READ_ONLY">Read Only (Dashboard)</SelectItem>
                                        <SelectItem value="READ_COLLABORATE" disabled>Collaborator (Soon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row items-end gap-4">
                            <div className="space-y-2 flex-1 w-full">
                                <Label>Expires in</Label>
                                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="14">14 Days</SelectItem>
                                        <SelectItem value="30">30 Days</SelectItem>
                                        <SelectItem value="90">90 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Create Share Link
                            </Button>
                        </div>
                    </div>

                    {/* Existing Links List */}
                    <div className="space-y-3">
                        <Label className="text-slate-400 uppercase text-xs tracking-wider">Active Share Links</Label>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                            </div>
                        ) : links.length === 0 ? (
                            <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-500 text-sm">
                                No active share links. Create one to share your progress.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {links.filter(l => !l.revokedAt).map((link) => (
                                    <div key={link.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group transition-all hover:bg-white/[0.08]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                                <LinkIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white flex items-center gap-2">
                                                    {link.label || 'Shared Progress'}
                                                    <Badge variant="outline" className="text-[10px] py-0 border-indigo-500/30 text-indigo-300">
                                                        {link.permissions.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}` : 'No expiry'}
                                                    {link.lastUsedAt && (
                                                        <span className="flex items-center gap-1 ml-2">
                                                            <Shield className="w-3 h-3" />
                                                            Last used {new Date(link.lastUsedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyToClipboard('LINK_TOKEN_PLACEHOLDER', link.id)} // Wait, need token? Actually, listFamilyLinks in auth-service doesn't return the raw token for security.
                                                // The owner should probably have the token only at creation time or we store it.
                                                // Actually, auth.controller.ts: listFamilyShareLinks does NOT return the tokenHash or raw token.
                                                // THIS IS A LIMITATION. Maybe the owner needs to recreate if they lose it.
                                                className="h-8 w-8 text-slate-400 hover:text-white"
                                                title="Copy Link (only available after creation)"
                                                disabled
                                            >
                                                {copiedId === link.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRevoke(link.id)}
                                                disabled={isRevoking}
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex gap-3">
                            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                            <div className="text-xs text-amber-200/80 leading-relaxed">
                                <strong>Security Note:</strong> Share links are active for the specified duration. Revoking a link immediately terminates access for anyone using that token. For privacy, raw tokens are not stored in our database, only their hashes.
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card variant="glass" className="overflow-hidden mt-6">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <div>
                            <CardTitle>Mentor Alerts (WhatsApp)</CardTitle>
                            <CardDescription>Send automated progress alerts with a time-bounded feedback link.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Recipient Label (Optional)</Label>
                                <Input
                                    placeholder="e.g. Mom, Mentor"
                                    value={subLabel}
                                    onChange={(e) => setSubLabel(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp Number</Label>
                                <Input
                                    placeholder="+91xxxxxxxxxx"
                                    value={subPhone}
                                    onChange={(e) => setSubPhone(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Overdue Threshold</Label>
                                <Input
                                    value={subOverdue}
                                    onChange={(e) => setSubOverdue(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Consistency Threshold</Label>
                                <Input
                                    value={subConsistency}
                                    onChange={(e) => setSubConsistency(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cooldown (minutes)</Label>
                                <Input
                                    value={subCooldown}
                                    onChange={(e) => setSubCooldown(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={async () => {
                                    try {
                                        if (!subPhone.trim()) return toast.error('WhatsApp number is required');
                                        await createSub({
                                            label: subLabel.trim() || undefined,
                                            recipientPhone: subPhone.trim(),
                                            overdueThreshold: Number.parseInt(subOverdue, 10),
                                            consistencyThreshold: Number.parseInt(subConsistency, 10),
                                            cooldownMinutes: Number.parseInt(subCooldown, 10),
                                        }).unwrap();
                                        toast.success('Mentor alert subscription created');
                                        setSubLabel('');
                                        setSubPhone('');
                                        refetchSubs();
                                    } catch (error) {
                                        console.error(error);
                                        toast.error('Failed to create subscription');
                                    }
                                }}
                                disabled={isCreatingSub}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                            >
                                {isCreatingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Alert
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-400">Active Subscriptions</Label>
                        {subsLoading ? (
                            <div className="space-y-2 mt-2">
                                {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                            </div>
                        ) : subs.length === 0 ? (
                            <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-500 text-sm mt-2">
                                No mentor alerts configured yet.
                            </div>
                        ) : (
                            <div className="space-y-2 mt-2">
                                {subs.filter((s: { revokedAt?: string | null }) => !s.revokedAt).map((sub: { id: string; label?: string | null; recipientPhone: string; overdueThreshold: number; consistencyThreshold: number; cooldownMinutes: number; enabled: boolean }) => (
                                    <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                        <div>
                                            <div className="font-semibold text-white">
                                                {sub.label || 'Recipient'} <span className="text-slate-400 font-normal">({sub.recipientPhone})</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                Overdue &gt; {sub.overdueThreshold} • Consistency &lt; {sub.consistencyThreshold} • Cooldown {sub.cooldownMinutes}m
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                                                disabled={isUpdatingSub}
                                                onClick={async () => {
                                                    try {
                                                        await updateSub({ id: sub.id, enabled: !sub.enabled }).unwrap();
                                                        toast.success(sub.enabled ? 'Disabled' : 'Enabled');
                                                    } catch {
                                                        toast.error('Update failed');
                                                    }
                                                }}
                                            >
                                                {sub.enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={isRevokingSub}
                                                onClick={() => setPendingRevokeSubId(sub.id)}
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card variant="glass" className="overflow-hidden mt-6">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-sky-400" />
                        <div>
                            <CardTitle>Mentor Feedback</CardTitle>
                            <CardDescription>Notes mentors leave via the alert dashboard link.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {feedbackLoading ? (
                        <div className="space-y-2">
                            {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />)}
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-500 text-sm">
                            No feedback yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {feedback.map((fb: { id: string; fromLabel?: string | null; createdAt: string; message: string }) => (
                                <div key={fb.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="text-xs text-slate-400">
                                        {fb.fromLabel ? `${fb.fromLabel} • ` : ''}{new Date(fb.createdAt).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-white mt-1 whitespace-pre-wrap">{fb.message}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!pendingRevokeId}
                onOpenChange={(open) => { if (!open) setPendingRevokeId(null); }}
                title="Revoke Share Link"
                description="Are you sure you want to revoke this share link? Mentors using it will lose access immediately."
                confirmLabel="Revoke"
                onConfirm={performRevoke}
            />

            <ConfirmDialog
                open={!!pendingRevokeSubId}
                onOpenChange={(open) => { if (!open) setPendingRevokeSubId(null); }}
                title="Remove Mentor Alert"
                description="Are you sure you want to remove this mentor alert subscription?"
                confirmLabel="Remove"
                onConfirm={async () => {
                    if (!pendingRevokeSubId) return;
                    try {
                        await revokeSub(pendingRevokeSubId).unwrap();
                        toast.success('Subscription removed');
                    } catch {
                        toast.error('Failed to remove subscription');
                    } finally {
                        setPendingRevokeSubId(null);
                    }
                }}
            />
        </>
    );
}
