'use client';

import { useState } from 'react';
import {
    useCreatePaymentIntentMutation,
    useVerifyPaymentMutation,
    useGetBillingProfileQuery,
} from '@repo/store';
import { CreditCard, Check, Crown, Shield, ArrowRight, Zap } from 'lucide-react';

// ---------------------------------------------------------------------------
// Razorpay Checkout.js global type
// ---------------------------------------------------------------------------
declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: () => void): void };
    }
}

function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.head.appendChild(script);
    });
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

interface Plan {
    id: 'PRO' | 'INSTITUTION';
    name: string;
    price: string;
    amountPaise: number;
    period: string;
    features: string[];
    highlighted: boolean;
    badge?: string;
}

const PLANS: Plan[] = [
    {
        id: 'PRO',
        name: 'Pro',
        price: '₹149',
        amountPaise: 14900,
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
        id: 'INSTITUTION',
        name: 'Institution',
        price: '₹999',
        amountPaise: 99900,
        period: '/year',
        features: [
            'Everything in Pro',
            'Classroom operations dashboard',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingSection() {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    const [createIntent, { isLoading: creatingOrder }] = useCreatePaymentIntentMutation();
    const [verifyPayment, { isLoading: verifying }] = useVerifyPaymentMutation();
    const { data: billingData, refetch: refetchBilling } = useGetBillingProfileQuery();

    const isSubmitting = creatingOrder || verifying;

    const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 6000);
    };

    const handleUpgrade = async () => {
        if (!selectedPlan) return;

        try {
            // Step 1 — Create Razorpay Order server-side
            const { intent } = await createIntent({
                plan: selectedPlan.id,
                provider: 'UPI',
            }).unwrap();

            // Step 2 — Load Razorpay Checkout.js
            await loadRazorpayScript();

            // Step 3 — Open Razorpay Checkout
            await new Promise<void>((resolve, reject) => {
                const rzp = new window.Razorpay({
                    key:       intent.keyId,
                    order_id:  intent.orderId,
                    amount:    intent.amountPaise,
                    currency:  intent.currency ?? 'INR',
                    name:      'Student Activity Tracker',
                    description: `${selectedPlan.name} Plan`,
                    image:     '/logo.png',
                    // Allow all Razorpay methods — user chooses UPI / card / netbanking in the modal
                    handler: async (response: {
                        razorpay_order_id: string;
                        razorpay_payment_id: string;
                        razorpay_signature: string;
                    }) => {
                        try {
                            // Step 4 — Verify signature + activate plan
                            await verifyPayment({
                                razorpayOrderId:   response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            }).unwrap();

                            showStatus('success', `🎉 ${selectedPlan.name} plan activated! Your account has been upgraded.`);
                            setSelectedPlan(null);
                            refetchBilling();
                            resolve();
                        } catch (err) {
                            const msg = typeof err === 'object' && err && 'data' in err
                                ? String((err as { data?: { message?: string } }).data?.message ?? 'Payment verification failed')
                                : 'Payment verification failed';
                            showStatus('error', msg);
                            reject(new Error(msg));
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            showStatus('info', 'Payment cancelled. You can retry whenever you\'re ready.');
                            resolve();
                        },
                    },
                    prefill: {},
                    theme: { color: '#6366f1' },
                });

                rzp.open();
            });
        } catch (err) {
            if (!(err instanceof Error && err.message === 'Payment verification failed')) {
                const msg = typeof err === 'object' && err && 'data' in err
                    ? String((err as { data?: { message?: string } }).data?.message ?? 'Something went wrong')
                    : (err instanceof Error ? err.message : 'Something went wrong');
                showStatus('error', msg);
            }
        }
    };

    const currentPlan = billingData?.profile;
    const isAlreadyActive = (plan: Plan) =>
        currentPlan?.plan === plan.id && currentPlan?.planStatus === 'ACTIVE';

    return (
        <div className="space-y-6">
            {/* Current plan banner */}
            {currentPlan && currentPlan.plan !== 'FREE' && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Current plan: <span className="font-semibold">{currentPlan.plan}</span>
                    {' '}({currentPlan.planStatus})
                    {currentPlan.renewalAt
                        ? ` · Renews ${new Date(currentPlan.renewalAt).toLocaleDateString()}`
                        : ''}
                </div>
            )}

            {/* Status toast */}
            {status && (
                <div className={`rounded-xl border p-3 text-sm text-center ${
                    status.type === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : status.type === 'error'
                            ? 'border-red-500/20 bg-red-500/10 text-red-300'
                            : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                }`}>
                    {status.message}
                </div>
            )}

            {/* Plans grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLANS.map(plan => (
                    <button
                        key={plan.id}
                        onClick={() => !isAlreadyActive(plan) && setSelectedPlan(p => p?.id === plan.id ? null : plan)}
                        disabled={isAlreadyActive(plan)}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                            isAlreadyActive(plan)
                                ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default'
                                : plan.highlighted
                                    ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                                    : selectedPlan?.id === plan.id
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
                            {plan.highlighted
                                ? <Crown className="w-6 h-6 text-indigo-400 mb-2" />
                                : <Shield className="w-6 h-6 text-emerald-400 mb-2" />}
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
                        <div className={`mt-4 py-2 rounded-xl text-center text-sm font-bold transition-all ${
                            isAlreadyActive(plan)
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : selectedPlan?.id === plan.id
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/5 text-slate-400'
                        }`}>
                            {isAlreadyActive(plan) ? '✓ Active' : selectedPlan?.id === plan.id ? 'Selected' : 'Choose Plan'}
                        </div>
                    </button>
                ))}
            </div>

            {/* Checkout button */}
            {selectedPlan && (
                <div className="animate-in slide-in-from-bottom-4 duration-300 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-white font-bold text-lg">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Pay via Razorpay — UPI, Card, Net Banking
                    </div>
                    <p className="text-sm text-slate-400">
                        You selected <span className="text-white font-semibold">{selectedPlan.name}</span> at{' '}
                        <span className="text-white font-semibold">{selectedPlan.price}{selectedPlan.period}</span>.
                        Click below to open the secure Razorpay checkout.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        disabled={isSubmitting}
                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creatingOrder
                            ? 'Creating order…'
                            : verifying
                                ? 'Verifying payment…'
                                : `Pay ${selectedPlan.price}`}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Secured by Razorpay · Your plan activates instantly after payment
                    </p>
                    <p className="text-xs text-slate-600 text-center">
                        Plan activates even if the browser closes — our webhook confirms payment automatically.
                    </p>
                </div>
            )}
        </div>
    );
}

