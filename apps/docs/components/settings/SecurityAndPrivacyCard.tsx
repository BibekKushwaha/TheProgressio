"use client";

import { Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePrivacySettingsController } from "@/hooks/usePrivacySettingsController";
import { ActiveSessions } from "@/components/settings/ActiveSessions";

export function SecurityAndPrivacyCard() {
    const { aiDisabled, toggleAiAssistance } = usePrivacySettingsController();

    return (
        <>
            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-indigo-400" />
                        <CardTitle>Security</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="w-full md:w-auto border-white/10 hover:bg-white/5"
                        onClick={() => toast.info("Password change feature is coming soon")}
                    >
                        Change Password
                    </Button>
                </CardContent>
            </Card>

            <ActiveSessions />

            <Card variant="glass">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-emerald-400" />
                        <CardTitle>AI Assistance</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="space-y-0.5">
                            <Label className="text-base">AI assistance</Label>
                            <p className="text-sm text-slate-400">Disable external AI calls and use fallback-only behavior</p>
                        </div>
                        <Switch
                            checked={!aiDisabled}
                            onCheckedChange={toggleAiAssistance}
                        />
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
