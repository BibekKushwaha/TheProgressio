import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useCreateOrderMutation,
    useGetSubscriptionStatusQuery,
    useCancelSubscriptionMutation,
    useGetPaymentHistoryQuery,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

const PLANS: Array<{ id: 'FREE' | 'PRO' | 'INSTITUTION'; label: string; amountPaise: number }> = [
    { id: 'FREE', label: 'Free', amountPaise: 0 },
    { id: 'PRO', label: 'Pro', amountPaise: 99900 },
    { id: 'INSTITUTION', label: 'Institution', amountPaise: 499900 },
];

export const SubscriptionScreen: React.FC<ProfileScreenProps<'Subscription'>> = ({ navigation }) => {
    const { data: profile, isLoading, refetch } = useGetSubscriptionStatusQuery(undefined);
    const { data: history } = useGetPaymentHistoryQuery(undefined);
    const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
    const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();

    const activePlan = (profile as any)?.plan ?? 'FREE';
    const planStatus = (profile as any)?.planStatus ?? 'INACTIVE';

    const handleCreateOrder = async (plan: 'FREE' | 'PRO' | 'INSTITUTION', amountPaise: number) => {
        try {
            await createOrder({
                plan,
                paymentMethod: 'UPI',
                amountPaise,
            }).unwrap();
            refetch();
        } catch {
            /* ignore */
        }
    };

    const handleCancel = async () => {
        try {
            await cancelSubscription().unwrap();
            refetch();
        } catch {
            /* ignore */
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Subscription</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.statusCard}>
                <Text style={styles.statusTitle}>Current Plan</Text>
                <Text style={styles.statusPlan}>{activePlan}</Text>
                <Text style={styles.statusMeta}>Status: {planStatus}</Text>
                {(profile as any)?.renewalAt && (
                    <Text style={styles.statusMeta}>Renews: {new Date((profile as any).renewalAt).toLocaleString()}</Text>
                )}
                {activePlan !== 'FREE' && (
                    <TouchableOpacity
                        onPress={handleCancel}
                        disabled={isCancelling}
                        style={[styles.cancelBtn, isCancelling && styles.disabled]}
                    >
                        <Text style={styles.cancelText}>{isCancelling ? 'Cancelling…' : 'Cancel subscription'}</Text>
                    </TouchableOpacity>
                )}
            </GlassCard>

            <Text style={styles.sectionTitle}>Choose Plan</Text>
            {PLANS.map((plan) => (
                <GlassCard key={plan.id} style={styles.planCard}>
                    <View style={styles.planRow}>
                        <View>
                            <Text style={styles.planName}>{plan.label}</Text>
                            <Text style={styles.planPrice}>
                                {plan.amountPaise === 0 ? 'Free' : `₹${(plan.amountPaise / 100).toFixed(0)}`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleCreateOrder(plan.id, plan.amountPaise)}
                            disabled={isCreating || (activePlan === plan.id && planStatus === 'ACTIVE')}
                            style={[
                                styles.planBtn,
                                (activePlan === plan.id && planStatus === 'ACTIVE') && styles.planBtnActive,
                                isCreating && styles.disabled,
                            ]}
                        >
                            <Text style={styles.planBtnText}>
                                {activePlan === plan.id && planStatus === 'ACTIVE' ? 'Active' : 'Select'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            ))}

            <Text style={styles.sectionTitle}>Payment History</Text>
            <FlatList
                data={Array.isArray(history) ? history : []}
                keyExtractor={(item: any, idx) => item.intentId ?? String(idx)}
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
                        <Text style={styles.historyTitle}>{item.plan} • {item.provider}</Text>
                        <Text style={styles.historyMeta}>
                            ₹{((item.amountPaise ?? 0) / 100).toFixed(0)} • {item.status}
                        </Text>
                        {item.createdAt && (
                            <Text style={styles.historyMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
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
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    refresh: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
    statusCard: { marginBottom: Spacing['4'] },
    statusTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusPlan: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginTop: 4 },
    statusMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
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
    planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    planPrice: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    planBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    planBtnActive: { backgroundColor: `${Colors.success}66` },
    planBtnText: { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '600' },
    historyList: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    historyCard: { marginBottom: Spacing['2'] },
    historyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    historyMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled: { opacity: 0.5 },
});
