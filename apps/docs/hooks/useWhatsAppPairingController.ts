'use client';

import { useGetWhatsAppPairingCodeQuery, useUnpairWhatsAppMutation } from '@repo/store';
import { toast } from 'sonner';
import { getDebugMountRefetchOptions, getDebugPollingOptions } from '@/lib/refetchDebug';

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
    const {
        data: pairingData,
        isLoading: isPairingLoading,
        refetch: refetchPairing,
    } = useGetWhatsAppPairingCodeQuery(undefined, {
        ...getDebugPollingOptions('whatsAppPairing.code', 30000),
        ...getDebugMountRefetchOptions('whatsAppPairing.mountRefetch'),
    });

    const [unpairWhatsApp, { isLoading: isUnpairing }] = useUnpairWhatsAppMutation();

    const whatsAppBotNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER;
    const whatsAppBotNumberDigits = whatsAppBotNumber ? whatsAppBotNumber.replace(/[^\d]/g, '') : '';
    const whatsAppPairingLink =
        whatsAppBotNumberDigits && pairingData?.pairingCode
            ? `https://wa.me/${whatsAppBotNumberDigits}?text=${encodeURIComponent(pairingData.pairingCode)}`
            : null;

    const copyPairingCode = () => {
        if (!pairingData?.pairingCode) return;
        navigator.clipboard.writeText(pairingData.pairingCode);
        toast.success('Pairing code copied to clipboard');
    };

    const refreshPairing = async () => refetchPairing();

    const unpair = async () => {
        try {
            await unpairWhatsApp().unwrap();
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
