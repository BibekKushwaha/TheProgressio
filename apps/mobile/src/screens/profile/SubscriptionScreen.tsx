import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useCreatePaymentIntentMutation,
    useVerifyPaymentMutation,
    useGetSubscriptionStatusQuery,
    useCancelSubscriptionMutation,
    useGetPaymentHistoryQuery,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

// Base URL of the planner service (set in .env as EXPO_PUBLIC_PLANNER_SERVICE_URL)
const PLANNER_URL =
    process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL ?? 'http://localhost:4001';

const PLANS: Array<{ id: 'PRO' | 'INSTITUTION'; label: string; amountPaise: number; price: string }> = [
    { id: 'PRO',         label: 'Pro',         amountPaise: 14900,  price: '₹149/mo' },
    { id: 'INSTITUTION', label: 'Institution', amountPaise: 99900,  price: '₹999/yr' },
];

export const SubscriptionScreen: React.FC<ProfileScreenProps<'Subscription'>> = ({ navigation }) => {
    const { data: profile, isLoading, refetch } = useGetSubscriptionStatusQuery(undefined);
    const { data: history } = useGetPaymentHistoryQuery(undefined);
    const [createIntent, { isLoading: isCreating }] = useCreatePaymentIntentMutation();
    const [verifyPayment, { isLoading: isVerifying }] = useVerifyPaymentMutation();
    const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();

    const [processingPlan, setProcessingPlan] = useState<string | null>(null);

    const activePlan = (profile as any)?.plan ?? 'FREE';
    const planStatus = (profile as any)?.planStatus ?? 'INACTIVE';

    /**
     * Full Razorpay flow for mobile:
     * 1. Create order server-side   → get orderId + keyId
     * 2. Open checkout.razorpay.com → hosted HTML page we serve at /api/payments/checkout
     * 3. Razorpay redirects to      → transition://subscription?razorpay_*=...
     * 4. Parse redirect params      → call /api/payments/verify
     * 5. Refetch billing profile
     */
    const handleUpgrade = async (planId: 'PRO' | 'INSTITUTION') => {
        setProcessingPlan(planId);
        try {
            // Step 1 — create Razorpay order
            const { intent } = await createIntent({ plan: planId, provider: 'UPI' }).unwrap();

            // Step 2 — build checkout URL served by planner-service
            const checkoutUrl =
                `${PLANNER_URL}/api/payments/checkout` +
                `?orderId=${encodeURIComponent(intent.orderId)}` +
                `&keyId=${encodeURIComponent(intent.keyId)}` +
                `&amount=${encodeURIComponent(String(intent.amountPaise))}` +
                `&plan=${encodeURIComponent(planId)}`;

            // Step 3 — open in expo-web-browser, wait for deep-link redirect
            const result = await WebBrowser.openAuthSessionAsync(
                checkoutUrl,
                'transition://subscription',
            );

            if (result.type !== 'success') {
                // User dismissed / cancelled
                return;
            }

            // Step 4 — parse Razorpay callback params from redirect URL
            const redirectUrl = new URL(result.url);
            const cancelled = redirectUrl.searchParams.get('cancelled');
            if (cancelled === 'true') return;

            const razorpayOrderId   = redirectUrl.searchParams.get('razorpay_order_id')   ?? '';
            const razorpayPaymentId = redirectUrl.searchParams.get('razorpay_payment_id') ?? '';
            const razorpaySignature = redirectUrl.searchParams.get('razorpay_signature')  ?? '';

            if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
                Alert.alert('Payment Error', 'Missing payment details in callback. Please contact support.');
                return;
            }

            // Step 5 — verify signature + activate plan
            await verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }).unwrap();

            Alert.alert('Success', 'Your plan has been activated! 🎉');
            refetch();
        } catch (err: unknown) {
            const msg =
                typeof err === 'object' && err !== null && 'data' in err
                    ? String((err as any).data?.message ?? 'Payment failed')
                    : 'Payment failed. Please try again.';
            Alert.alert('Payment Failed', msg);
        } finally {
            setProcessingPlan(null);
        }
    };

    const handleCancel = async () => {
        Alert.alert('Cancel Subscription', 'Are you sure you want to cancel?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelSubscription().unwrap();
                        refetch();
                    } catch {
                        Alert.alert('Error', 'Could not cancel subscription. Try again.');
                    }
                },
            },
        ]);
    };

    const isActive = (planId: string) => activePlan === planId && planStatus === 'ACTIVE';
    const isBusy = isCreating || isVerifying;

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Subscription</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            {/* Current plan card */}
            <GlassCard style={styles.statusCard}>
                <Text style={styles.statusTitle}>CURRENT PLAN</Text>
                <Text style={styles.statusPlan}>{activePlan}</Text>
                <Text style={styles.statusMeta}>Status: {planStatus}</Text>
                {(profile as any)?.renewalAt && (
                    <Text style={styles.statusMeta}>
                        Renews: {new Date((profile as any).renewalAt).toLocaleDateString()}
                    </Text>
                )}
                {activePlan !== 'FREE' && planStatus === 'ACTIVE' && (
                    <TouchableOpacity
                        onPress={handleCancel}
                        disabled={isCancelling}
                        style={[styles.cancelBtn, isCancelling && styles.disabled]}
                    >
                        <Text style={styles.cancelText}>
                            {isCancelling ? 'Cancelling…' : 'Cancel subscription'}
                        </Text>
                    </TouchableOpacity>
                )}
            </GlassCard>

            {/* Plans */}
            <Text style={styles.sectionTitle}>Upgrade Plan</Text>
            {PLANS.map((plan) => (
                <GlassCard key={plan.id} style={styles.planCard}>
                    <View style={styles.planRow}>
                        <View>
                            <Text style={styles.planName}>{plan.label}</Text>
                            <Text style={styles.planPrice}>{plan.price}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleUpgrade(plan.id)}
                            disabled={isBusy || isActive(plan.id)}
                            style={[
                                styles.planBtn,
                                isActive(plan.id) && styles.planBtnActive,
                                (isBusy || processingPlan === plan.id) && styles.disabled,
                            ]}
                        >
                            <Text style={styles.planBtnText}>
                                {processingPlan === plan.id
                                    ? 'Processing…'
                                    : isActive(plan.id)
                                        ? 'Active'
                                        : 'Upgrade'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            ))}

            {/* Payment history */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing['4'] }]}>Payment History</Text>
            <FlatList
                data={Array.isArray(history) ? history : []}
                keyExtractor={(item: any, idx: number) => item.intentId ?? String(idx)}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.historyList}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading billing data…' : 'No payment records yet.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }: { item: any }) => (
                    <GlassCard style={styles.historyCard}>
                        <Text style={styles.historyTitle}>
                            {item.plan} · {item.provider}
                        </Text>
                        <Text style={styles.historyMeta}>
                            ₹{((item.amountPaise ?? 0) / 100).toFixed(0)} · {item.status}
                        </Text>
                        {item.createdAt && (
                            <Text style={styles.historyMeta}>
                                {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                        )}
                    </GlassCard>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing['4'],
        marginBottom: Spacing['4'],
    },
    back:    { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    title:   { color: Colors.textPrimary,  fontSize: Typography.fontSize.lg,   fontWeight: '700' },
    refresh: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
    statusCard:  { marginBottom: Spacing['4'] },
    statusTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusPlan:  { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginTop: 4 },
    statusMeta:  { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    cancelBtn: {
        marginTop: Spacing['3'],
        alignSelf: 'flex-start',
        backgroundColor: `${Colors.error}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['1'],
    },
    cancelText: { color: Colors.error, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    planCard: { marginBottom: Spacing['2'] },
    planRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planName:  { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    planPrice: { color: Colors.textMuted,   fontSize: Typography.fontSize.xs,   marginTop: 2 },
    planBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    planBtnActive:  { backgroundColor: `${Colors.success}66` },
    planBtnText:    { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '600' },
    historyList:    { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    historyCard:    { marginBottom: Spacing['2'] },
    historyTitle:   { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    historyMeta:    { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyText:      { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled:       { opacity: 0.5 },
});


