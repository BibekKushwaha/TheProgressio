'use client';

import { useState } from 'react';
import { useCreatePaymentIntentMutation, useCreateUpiCollectMutation, useGetBillingProfileQuery } from '@repo/store';
import { CreditCard, Check, Star, Zap, Shield, Crown, Smartphone, Building2, ArrowRight } from 'lucide-react';

interface Plan {
    name: string;
    price: string;
    period: string;
    features: string[];
    highlighted: boolean;
    badge?: string;
}

const PLANS: Plan[] = [
    {
        name: 'Free',
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
        price: '₹99',
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
        name: 'Plus',
        price: '₹999',
        period: '/year',
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

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm', color: 'from-indigo-500 to-blue-500' },
    { id: 'netbanking', label: 'Net Banking', icon: Building2, desc: 'All major banks supported', color: 'from-green-500 to-emerald-500' },
    { id: 'card', label: 'Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay', color: 'from-purple-500 to-pink-500' },
];

export function PricingSection() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [upiId, setUpiId] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [createIntent, { isLoading: creatingIntent }] = useCreatePaymentIntentMutation();
    const [createUpiCollect, { isLoading: creatingCollect }] = useCreateUpiCollectMutation();
    const { data: billingData } = useGetBillingProfileQuery();

    const isSubmitting = creatingIntent || creatingCollect;

    const resolvePlan = (value: string | null): 'PRO' | 'INSTITUTION' | null => {
        if (value === 'Pro') return 'PRO';
        if (value === 'Institution') return 'INSTITUTION';
        return null;
    };

    const resolveProvider = (value: string | null): 'UPI' | 'NET_BANKING' | 'CARD' | null => {
        if (value === 'upi') return 'UPI';
        if (value === 'netbanking') return 'NET_BANKING';
        if (value === 'card') return 'CARD';
        return null;
    };

    const handlePayment = async () => {
        try {
            const plan = resolvePlan(selectedPlan);
            const provider = resolveProvider(selectedMethod);
            if (!plan || !provider) {
                setPaymentStatus('Select a paid plan and payment method first.');
                return;
            }

            if (provider === 'UPI' && !upiId.trim()) {
                setPaymentStatus('Enter a valid UPI ID to continue.');
                return;
            }

            const intentResponse = await createIntent({ plan, provider }).unwrap();
            const intent = intentResponse.intent;

            if (provider === 'UPI') {
                const collectResponse = await createUpiCollect({
                    intentId: intent.intentId,
                    upiId: upiId.trim(),
                }).unwrap();

                setPaymentStatus(`UPI collect created. Approve request for ref ${collectResponse.collect.paymentRef}.`);
            } else {
                setPaymentStatus(`Payment intent ${intent.paymentRef} created. Complete provider checkout; plan will activate after webhook confirmation.`);
            }
        } catch (error) {
            const message = typeof error === 'object' && error && 'data' in error
                ? String((error as { data?: { message?: string } }).data?.message ?? 'Payment request failed')
                : 'Payment request failed';
            setPaymentStatus(message);
        }

        setTimeout(() => setPaymentStatus(null), 5000);
    };

    return (
        <div className="space-y-6">
            {billingData?.profile && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Current plan: <span className="font-semibold">{billingData.profile.plan}</span> ({billingData.profile.planStatus})
                    {billingData.profile.renewalAt ? ` • Renews ${new Date(billingData.profile.renewalAt).toLocaleDateString()}` : ''}
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                    <button
                        key={plan.name}
                        onClick={() => setSelectedPlan(plan.name === 'Free' ? null : plan.name)}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${plan.highlighted
                            ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                            : selectedPlan === plan.name
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
                        {plan.name !== 'Free' && (
                            <div className={`mt-4 py-2 rounded-xl text-center text-sm font-bold transition-all ${selectedPlan === plan.name
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/5 text-slate-400'
                                }`}>
                                {selectedPlan === plan.name ? 'Selected' : 'Choose Plan'}
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
                            {paymentStatus && (
                                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-300 text-center">
                                    {paymentStatus}
                                </div>
                            )}
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
                                        disabled={isSubmitting}
                                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                                    >
                                        {isSubmitting ? 'Processing...' : `Pay ${selectedPlan === 'Pro' ? '₹99' : '₹999'}`}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handlePayment}
                                    disabled={isSubmitting}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Processing...' : `Continue to ${selectedMethod === 'netbanking' ? 'Net Banking' : 'Card Payment'}`}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
