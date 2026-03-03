"use client";

import { MessageSquare, Clock, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWhatsAppPairingController } from "@/hooks/useWhatsAppPairingController";

export function WhatsAppCard() {
    const {
        pairingData,
        isPairingLoading,
        isUnpairing,
        whatsAppBotNumber,
        whatsAppPairingLink,
        copyPairingCode,
        refreshPairing,
        unpair,
    } = useWhatsAppPairingController();

    return (
        <Card variant="glass">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    <CardTitle>WhatsApp Bot</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${pairingData?.verified ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'}`}>
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-medium">Nudge Notifications</div>
                            <div className="text-sm text-slate-400">
                                {pairingData?.verified
                                    ? `Paired with ${pairingData.whatsappNumber || 'your number'}`
                                    : 'Receive study reminders and streak alerts'
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`text-xs font-semibold px-3 py-1 rounded-full ${pairingData?.verified ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-slate-400 bg-white/10'}`}>
                        {pairingData?.verified ? 'Paired' : 'Not Paired'}
                    </div>
                </div>

                {!pairingData?.verified && (
                    <div className="p-6 bg-green-950/20 border border-green-500/20 rounded-xl space-y-4">
                        <div className="text-sm text-slate-300 font-medium">To pair your WhatsApp:</div>
                        <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside pl-2">
                            <li>Save <span className="text-green-400 font-mono bg-green-950/40 px-1 rounded">{whatsAppBotNumber ?? 'the bot number'}</span> as &quot;Study Bot&quot;</li>
                            <li>Send the pairing code below to the bot</li>
                            <li>You&apos;ll receive a confirmation message</li>
                        </ol>
                        {!whatsAppBotNumber && (
                            <div className="text-xs text-amber-300/90">
                                Missing <span className="font-mono">NEXT_PUBLIC_WHATSAPP_BOT_NUMBER</span>. Set it in <span className="font-mono">apps/docs/.env.local</span> to show the bot number and enable the one-click WhatsApp link.
                            </div>
                        )}
                        <div className="flex items-center gap-3 pt-2">
                            <code className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-green-400 font-mono text-lg tracking-widest text-center">
                                {isPairingLoading ? "Generating..." : (pairingData?.pairingCode || "Code unavailable")}
                            </code>
                            <Button
                                className="bg-green-600 hover:bg-green-700 h-full"
                                onClick={copyPairingCode}
                                disabled={isPairingLoading || !pairingData?.pairingCode}
                            >
                                Copy Code
                            </Button>
                        </div>
                        <Button
                            asChild={Boolean(whatsAppPairingLink)}
                            className="bg-green-600/80 hover:bg-green-700 disabled:opacity-50"
                            disabled={!whatsAppPairingLink}
                        >
                            {whatsAppPairingLink ? (
                                <a href={whatsAppPairingLink} target="_blank" rel="noreferrer">
                                    Open WhatsApp
                                </a>
                            ) : (
                                <span>Open WhatsApp</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs border-white/10 text-slate-400 hover:text-slate-200"
                            onClick={refreshPairing}
                            disabled={isPairingLoading}
                        >
                            {isPairingLoading ? "Checking..." : "Refresh Pairing Status"}
                        </Button>
                    </div>
                )}

                {pairingData?.verified && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-between">
                        <div className="text-sm text-indigo-300">
                            <span className="font-medium">Active Assistant:</span> My Study Bot
                        </div>
                        <Button
                            variant="ghost"
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={unpair}
                            disabled={isUnpairing}
                        >
                            {isUnpairing ? "Unpairing..." : "Unpair"}
                        </Button>
                    </div>
                )}

                <Separator className="bg-white/10" />

                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4 text-green-400" />
                    Smart nudge scheduling is configured in the Notifications card above.
                </div>
            </CardContent>
        </Card>
    );
}
