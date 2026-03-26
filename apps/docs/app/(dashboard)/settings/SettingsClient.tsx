"use client";

import { Wifi, CreditCard, Languages, Moon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuietHoursPanel } from "@/components/settings/QuietHoursPanel";
import { PricingSection } from "@/components/settings/PricingSection";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { FamilyShareManagement } from "@/components/settings/FamilyShareManagement";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { PreferencesCard } from "@/components/settings/PreferencesCard";
import { NotificationsCard } from "@/components/settings/NotificationsCard";
import { WhatsAppCard } from "@/components/settings/WhatsAppCard";
import { SecurityAndPrivacyCard } from "@/components/settings/SecurityAndPrivacyCard";
import { useAccountSettingsController } from "@/hooks/useAccountSettingsController";

/** 
 * Minimal client shell: only renders the skeleton while checking isProfileLoading.
 * Everything else delegates to fully isolated child cards.
 * Each card encapsulates its own hooks — changes in one card never trigger re-renders in others.
 */
export function SettingsClient() {
    const { isProfileLoading } = useAccountSettingsController();

    if (isProfileLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Settings & Integrations"
                    subtitle="Customize your experience, manage integrations, and configure quiet hours."
                />
                <Card variant="glass">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Settings & Integrations"
                subtitle="Customize your experience, manage integrations, and configure quiet hours."
            />

            {/* Each card is an isolated client boundary — only re-renders when its own state changes */}
            <ProfileCard />

            <PreferencesCard />

            {/* Language & Region */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Languages className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Language & Region</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <LanguageSelector />
                </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Quiet Hours</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <QuietHoursPanel />
                </CardContent>
            </Card>

            <NotificationsCard />

            {/* Sync Status — static display, no state needed */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-green-400" />
                        <CardTitle>Sync Status</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                            <div>
                                <div className="font-medium">Local-First Sync</div>
                                <div className="text-sm text-slate-400">All data is synced and up to date</div>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            Connected
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div>
                            <div className="font-medium">Pending Changes</div>
                            <div className="text-sm text-slate-400">Changes waiting to be synced to cloud</div>
                        </div>
                        <span className="text-lg font-mono font-bold text-slate-300">0</span>
                    </div>
                </CardContent>
            </Card>

            <WhatsAppCard />

            {/* Premium */}
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-yellow-400" />
                        <CardTitle>Premium Upgrade</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <PricingSection />
                </CardContent>
            </Card>

            <FamilyShareManagement />

            <SecurityAndPrivacyCard />
        </div>
    );
}
