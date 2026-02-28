'use client';

import { useEffect, useState } from 'react';
import { useGetWhatsAppPairingCodeQuery, useUnpairWhatsAppMutation } from '@repo/store';
import { toast } from 'sonner';
import { usePageVisibility } from '@/hooks/usePageVisibility';

interface WhatsAppPairingController {
    pairingData: ReturnType<typeof useGetWhatsAppPairingCodeQuery>['data'];
    isPairingLoading: boolean;
    isUnpairing: boolean;
    whatsAppBotNumber: string | undefined;
    whatsAppPairingLink: string | null;
    copyPairingCode: () => void;
    refreshPairing: () => Promise<unknown>;
    unpair: () => Promise<boolean>;
}

export function useWhatsAppPairingController(): WhatsAppPairingController {
    const [isPairingPolling, setIsPairingPolling] = useState(true);
    const isPageVisible = usePageVisibility();

    const {
        data: pairingData,
        isLoading: isPairingLoading,
        refetch: refetchPairing,
    } = useGetWhatsAppPairingCodeQuery(undefined, {
        pollingInterval: isPairingPolling && isPageVisible ? 30000 : 0,
        refetchOnMountOrArgChange: true,
    });

    const [unpairWhatsApp, { isLoading: isUnpairing }] = useUnpairWhatsAppMutation();

    const whatsAppBotNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER;
    const whatsAppBotNumberDigits = whatsAppBotNumber ? whatsAppBotNumber.replace(/[^\d]/g, '') : '';
    const whatsAppPairingLink =
        whatsAppBotNumberDigits && pairingData?.pairingCode
            ? `https://wa.me/${whatsAppBotNumberDigits}?text=${encodeURIComponent(pairingData.pairingCode)}`
            : null;

    useEffect(() => {
        if (pairingData?.verified) {
            setIsPairingPolling(false);
        }
    }, [pairingData?.verified]);

    const copyPairingCode = () => {
        if (!pairingData?.pairingCode) return;
        navigator.clipboard.writeText(pairingData.pairingCode);
        toast.success('Pairing code copied to clipboard');
    };

    const refreshPairing = async () => refetchPairing();

    const unpair = async () => {
        try {
            await unpairWhatsApp().unwrap();
            setIsPairingPolling(true);
            await refetchPairing();
            toast.success('WhatsApp account unpaired');
            return true;
        } catch {
            toast.error('Failed to unpair WhatsApp');
            return false;
        }
    };

    return {
        pairingData,
        isPairingLoading,
        isUnpairing,
        whatsAppBotNumber,
        whatsAppPairingLink,
        copyPairingCode,
        refreshPairing,
        unpair,
    };
}