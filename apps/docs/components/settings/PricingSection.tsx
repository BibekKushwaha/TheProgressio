'use client';

import { useState, useCallback, useEffect } from 'react';
import Script from 'next/script';
import { CreditCard, Check, Star, Zap, Shield, Crown, Smartphone, Building2, ArrowRight, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import {
    useCreateOrderMutation,
    useVerifyPaymentMutation,
    useGetSubscriptionStatusQuery,
    useCancelSubscriptionMutation,
    type PlanId,
    type PaymentMethod,
} from '@repo/store';

// ─── Razorpay global type ───────────────────────────────────────────────────────
declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
    }
}

// ─── Plan & method config ───────────────────────────────────────────────────────
interface Plan {
    name: string;
    planId: PlanId | null;
    price: string;
    period: string;
    features: string[];
    highlighted: boolean;
    badge?: string;
}

const PLANS: Plan[] = [
    {
        name: 'Free',
        planId: null,
        price: '₹0',
        period: 'forever',
        features: [
            'Up to 20 tasks',
            'Basic analytics',
            'Single device sync',
            '2 habit trackers',
            'Community support',
        ],
        highlighted: false,
    },
    {
        name: 'Pro',
        planId: 'PRO',
        price: '₹149',
        period: '/month',
        features: [
            'Unlimited tasks & habits',
            'AI task decomposition',
            'NLP command bar',
            'Advanced analytics',
            'Multi-device sync',
            'WhatsApp nudges',
            'Exam War Room',
            'Priority support',
        ],
        highlighted: true,
        badge: 'Most Popular',
    },
    {
        name: 'Institution',
        planId: 'INSTITUTION',
        price: '₹999',
        period: '/month',
        features: [
            'Everything in Pro',
            'QR attendance tracking',
            'Family Connect portal',
            'Mentor dashboards',
            'Batch management',
            'Custom branding',
            'Dedicated support',
        ],
        highlighted: false,
        badge: 'For Schools',
    },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof Smartphone; desc: string; color: string }[] = [
    { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm', color: 'from-indigo-500 to-blue-500' },
    { id: 'netbanking', label: 'Net Banking', icon: Building2, desc: 'All major banks supported', color: 'from-green-500 to-emerald-500' },
    { id: 'card', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay', color: 'from-purple-500 to-pink-500' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export function PricingSection() {
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [upiId, setUpiId] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [razorpayReady, setRazorpayReady] = useState(false);

    // RTK Query hooks
    const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
    const [verifyPayment, { isLoading: isVerifying }] = useVerifyPaymentMutation();
    const { data: subscription, refetch: refetchStatus } = useGetSubscriptionStatusQuery();
    const [cancelSubscription, { isLoading: isCancelling }] = useCancelSubscriptionMutation();

    const isProcessing = isCreatingOrder || isVerifying;

    // Clear status message after 5s
    useEffect(() => {
        if (!paymentStatus) return;
        const t = setTimeout(() => setPaymentStatus(null), 5000);
        return () => clearTimeout(t);
    }, [paymentStatus]);

    // ─── Payment handler ────────────────────────────────────────────────
    const handlePayment = useCallback(async () => {
        if (!selectedPlan || !selectedMethod) return;

        try {
            // 1. Create order on backend
            const order = await createOrder({ plan: selectedPlan, method: selectedMethod }).unwrap();

            // 2. Mock mode — no Razorpay SDK needed
            if (order.mock) {
                // Auto-verify with mock values
                await verifyPayment({
                    razorpayOrderId: order.razorpayOrderId,
                    razorpayPaymentId: `pay_mock_${Date.now()}`,
                    razorpaySignature: 'mock_signature',
                    plan: selectedPlan,
                }).unwrap();

                setPaymentStatus({ type: 'success', message: `${selectedPlan} plan activated (dev mode)!` });
                refetchStatus();
                setSelectedPlan(null);
                setSelectedMethod(null);
                return;
            }

            // 3. Open Razorpay Checkout
            if (!razorpayReady || !window.Razorpay) {
                setPaymentStatus({ type: 'error', message: 'Razorpay SDK is loading. Please try again.' });
                return;
            }

            const rzp = new window.Razorpay({
                key: order.keyId,
                amount: order.amountPaise,
                currency: order.currency,
                name: 'Transition',
                description: order.description,
                order_id: order.razorpayOrderId,
                prefill: {
                    ...(selectedMethod === 'upi' && upiId ? { vpa: upiId } : {}),
                },
                theme: { color: '#6366f1' },
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        await verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            plan: selectedPlan,
                        }).unwrap();

                        setPaymentStatus({ type: 'success', message: `${selectedPlan} plan activated successfully!` });
                        refetchStatus();
                        setSelectedPlan(null);
                        setSelectedMethod(null);
                    } catch {
                        setPaymentStatus({ type: 'error', message: 'Payment verification failed. Contact support.' });
                    }
                },
                modal: {
                    ondismiss: () => {
                        setPaymentStatus({ type: 'info', message: 'Payment cancelled.' });
                    },
                },
            });

            rzp.on('payment.failed', () => {
                setPaymentStatus({ type: 'error', message: 'Payment failed. Please try again.' });
            });

            rzp.open();
        } catch (err: unknown) {
            const message = err && typeof err === 'object' && 'data' in err
                ? String((err as { data: { error?: string } }).data?.error ?? 'Payment failed')
                : 'Payment failed. Please try again.';
            setPaymentStatus({ type: 'error', message });
        }
    }, [selectedPlan, selectedMethod, upiId, razorpayReady, createOrder, verifyPayment, refetchStatus]);

    // ─── Cancel handler ─────────────────────────────────────────────────
    const handleCancel = useCallback(async () => {
        try {
            await cancelSubscription().unwrap();
            setPaymentStatus({ type: 'info', message: 'Subscription cancelled.' });
            refetchStatus();
        } catch {
            setPaymentStatus({ type: 'error', message: 'Failed to cancel subscription.' });
        }
    }, [cancelSubscription, refetchStatus]);

    return (
        <div className="space-y-6">
            {/* Razorpay Checkout SDK */}
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                onReady={() => setRazorpayReady(true)}
            />

            {/* Current Plan Banner */}
            {subscription?.active && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl">
                    <div>
                        <span className="text-sm text-slate-400">Current Plan</span>
                        <h3 className="text-lg font-bold text-white">{subscription.plan}</h3>
                        {subscription.currentPeriodEnd && (
                            <span className="text-xs text-slate-400">
                                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                        {isCancelling ? 'Cancelling…' : 'Cancel Plan'}
                    </button>
                </div>
            )}

            {/* Status Message */}
            {paymentStatus && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm text-center border ${
                    paymentStatus.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : paymentStatus.type === 'error'
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                }`}>
                    {paymentStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> :
                     paymentStatus.type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> : null}
                    {paymentStatus.message}
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                    <button
                        key={plan.name}
                        onClick={() => setSelectedPlan(plan.planId)}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${plan.highlighted
                                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                                : selectedPlan === plan.planId && plan.planId
                                    ? 'bg-white/10 border-white/30'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                    >
                        {plan.badge && (
                            <span className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full">
                                {plan.badge}
                            </span>
                        )}
                        <div className="mb-3">
                            {plan.highlighted ? (
                                <Crown className="w-6 h-6 text-indigo-400 mb-2" />
                            ) : plan.name === 'Institution' ? (
                                <Shield className="w-6 h-6 text-emerald-400 mb-2" />
                            ) : (
                                <Star className="w-6 h-6 text-slate-400 mb-2" />
                            )}
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-black text-white">{plan.price}</span>
                                <span className="text-sm text-slate-400">{plan.period}</span>
                            </div>
                        </div>
                        <ul className="space-y-2">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    {feat}
                                </li>
                            ))}
                        </ul>
                        {plan.planId && (
                            <div className={`mt-4 py-2 rounded-xl text-center text-sm font-bold transition-all ${selectedPlan === plan.planId
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/5 text-slate-400'
                                }`}>
                                {selectedPlan === plan.planId ? 'Selected' : 'Choose Plan'}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Payment Methods (shown when plan selected) */}
            {selectedPlan && (
                <div className="animate-in slide-in-from-bottom-4 duration-300 bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Choose Payment Method
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {PAYMENT_METHODS.map(method => (
                            <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedMethod === method.id
                                        ? 'border-indigo-500/50 bg-indigo-500/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${method.color}`}>
                                    <method.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">{method.label}</div>
                                    <div className="text-xs text-slate-400">{method.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedMethod && (
                        <div className="mt-4 animate-in slide-in-from-bottom-2 duration-200">
                            {selectedMethod === 'upi' ? (
                                <div className="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <input
                                        type="text"
                                        placeholder="Enter UPI ID (e.g., name@paytm)"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                Pay {selectedPlan === 'PRO' ? '₹149' : '₹999'}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessing}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            Continue to {selectedMethod === 'netbanking' ? 'Net Banking' : 'Card Payment'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
