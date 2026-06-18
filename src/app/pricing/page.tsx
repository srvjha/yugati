'use client';

import { useState }  from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC }   from '@/trpc/client';
import { toast }     from 'sonner';
import { Check, Zap, ArrowRight, Mail, PhoneCall, AlertTriangle } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const FREE_FEATURES    = ['30 AI messages/month', '1 voice message/month', '10 email compose/month', 'Gmail + Calendar access', 'Manual email inbox'];
const STD_FEATURES     = ['150 AI messages/month', '15 voice messages/month', '50 email compose/month', 'Everything in Free', 'Priority support'];
const PREMIUM_FEATURES = ['500 AI messages/month', '30 voice messages/month', '150 email compose/month', 'Everything in Standard', '5000 char message limit', 'Priority support'];

export default function PricingPage() {
  const trpc        = useTRPC();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading]             = useState<string | null>(null);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

  const { data: myPlan } = useQuery({
    ...trpc.plans.getMyPlan.queryOptions(),
    retry: false,
  });

  const cancelMutation = useMutation(trpc.plans.cancelSubscription.mutationOptions({
    onSuccess: async () => {
      toast.success('Moved to free plan.');
      setShowDowngradeConfirm(false);
      await queryClient.invalidateQueries();
      router.push('/dashboard/billing');
    },
    onError: (err) => toast.error(err.message),
  }));

  async function upgrade(plan: 'standard' | 'premium') {
    setLoading(plan);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { alert('Failed to load payment gateway. Check your connection.'); return; }

      const res  = await fetch('/api/payments/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });

      if (res.status === 401) { router.push('/'); return; }

      const order = await res.json() as {
        orderId: string; amount: number; currency: string; keyId: string; planName: string;
      };

      const rzp = new window.Razorpay({
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        order_id:    order.orderId,
        name:        'Yugati',
        description: `${order.planName} Plan — 1 month`,
        theme:       { color: '#18181b' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/payments/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (verify.ok) {
            router.push('/dashboard/billing?upgraded=1');
          } else {
            alert('Payment verification failed — contact support.');
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  const currentPlan = myPlan?.planId ?? null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-6 h-14 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black">Y</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Yugati</span>
        </button>
        <button
          onClick={() => router.push('/dashboard/mail')}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Back to dashboard →
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-full text-xs text-zinc-400 mb-6">
            <Zap size={11} className="text-yellow-400" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Pick the right plan
          </h1>
          <p className="text-zinc-500 text-lg max-w-md mx-auto">
            All plans include Gmail + Calendar integration. Upgrade anytime.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          {/* Free */}
          <PlanCard
            name="Free"
            price={0}
            description="Try everything at no cost"
            features={FREE_FEATURES}
            isCurrent={currentPlan === 'free'}
            ctaLabel={currentPlan === 'free' ? 'Current plan' : 'Get started free'}
            ctaDisabled={currentPlan === 'free'}
            onCta={() => {
              if (currentPlan && currentPlan !== 'free') {
                setShowDowngradeConfirm(true);
              } else {
                router.push('/');
              }
            }}
            accent="zinc"
          />

          {/* Standard */}
          <PlanCard
            name="Standard"
            price={199}
            description="For daily email + calendar power users"
            features={STD_FEATURES}
            isCurrent={currentPlan === 'standard'}
            ctaLabel={
              currentPlan === 'standard' ? 'Current plan' :
              currentPlan === 'premium'  ? 'Downgrade'   : 'Upgrade →'
            }
            ctaDisabled={currentPlan === 'standard'}
            onCta={() => void upgrade('standard')}
            loading={loading === 'standard'}
            accent="blue"
          />

          {/* Premium */}
          <PlanCard
            name="Premium"
            price={499}
            description="For professionals who rely on AI daily"
            features={PREMIUM_FEATURES}
            isCurrent={currentPlan === 'premium'}
            ctaLabel={currentPlan === 'premium' ? 'Current plan' : 'Upgrade →'}
            ctaDisabled={currentPlan === 'premium'}
            onCta={() => void upgrade('premium')}
            loading={loading === 'premium'}
            accent="green"
            highlighted
          />
        </div>

        {/* Enterprise */}
        <div className="border border-zinc-800 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-950/60">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Enterprise</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Custom pricing for teams</h3>
            <p className="text-zinc-500 text-sm max-w-lg">
              Unlimited everything, team seats, SSO, dedicated support, custom integrations, and invoicing. Built around how your team works.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {['Unlimited AI messages', 'Multiple team members', 'Custom integrations', 'SLA + dedicated support', 'SSO / SAML', 'Invoice billing (GST)'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check size={11} className="text-zinc-600 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <a
              href="mailto:jhasaurav0209001@gmail.com?subject=Yugati Enterprise Inquiry"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-100 transition-colors whitespace-nowrap"
            >
              <Mail size={14} /> Contact sales
            </a>
            <a
              href="mailto:jhasaurav0209001@gmail.com?subject=Yugati Enterprise Demo"
              className="flex items-center gap-2 px-5 py-2.5 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:border-zinc-500 hover:text-white transition-colors whitespace-nowrap"
            >
              <PhoneCall size={14} /> Book a demo
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-700 mt-10">
          All prices in INR. Plans renew monthly. Cancel anytime. Payments secured by Razorpay.
        </p>
      </div>

      {/* Downgrade to free confirmation */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Switch to Free plan?</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your current subscription will be cancelled immediately.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              You&apos;ll lose access to your paid plan&apos;s features right away and usage limits will
              reset to free tier. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Keep plan
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Switching…' : 'Yes, switch to free'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  name, price, description, features,
  isCurrent, ctaLabel, ctaDisabled, onCta, loading, accent, highlighted,
}: {
  name: string; price: number; description: string; features: string[];
  isCurrent: boolean; ctaLabel: string; ctaDisabled: boolean;
  onCta: () => void; loading?: boolean; accent: 'zinc' | 'blue' | 'green'; highlighted?: boolean;
}) {
  const accentClasses = {
    zinc:  { dot: 'bg-zinc-500',  bar: 'border-zinc-700',    cta: 'bg-zinc-800 text-white hover:bg-zinc-700',              check: 'text-zinc-500' },
    blue:  { dot: 'bg-blue-400',  bar: 'border-blue-500/30', cta: 'bg-blue-600 text-white hover:bg-blue-500',              check: 'text-blue-400' },
    green: { dot: 'bg-green-400', bar: 'border-green-500/30',cta: 'bg-white text-black hover:bg-zinc-100',                 check: 'text-green-400' },
  }[accent];

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-all
      ${highlighted
        ? 'border-zinc-600 bg-zinc-900/80 shadow-[0_0_40px_rgba(255,255,255,0.04)]'
        : 'border-zinc-800 bg-zinc-950/60'}`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
          Most popular
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${accentClasses.dot}`} />
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        {isCurrent && (
          <span className="ml-auto text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
            Active
          </span>
        )}
      </div>

      <div className="mt-4 mb-1">
        {price === 0 ? (
          <span className="text-3xl font-bold">Free</span>
        ) : (
          <>
            <span className="text-3xl font-bold">₹{price}</span>
            <span className="text-zinc-500 text-sm ml-1">/month</span>
          </>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-6">{description}</p>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-xs text-zinc-300">
            <Check size={12} className={`mt-0.5 shrink-0 ${accentClasses.check}`} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        disabled={ctaDisabled || loading}
        className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed ${accentClasses.cta}`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          <>
            {ctaLabel}
            {!ctaDisabled && <ArrowRight size={13} />}
          </>
        )}
      </button>
    </div>
  );
}
