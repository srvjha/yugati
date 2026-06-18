'use client';

import { useQuery }      from '@tanstack/react-query';
import { useTRPC }       from '@/trpc/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect }     from 'react';
import { toast }         from 'sonner';
import { SidebarNav }    from '../components/sidebar-nav';
import { useSession }    from '@/lib/auth-client';
import { PLANS }         from '@/lib/plans';
import {
  ArrowRight, CreditCard, Zap, CheckCircle, MessageSquare,
  Mic, Pencil, Calendar, ExternalLink, Shield, Sparkles,
} from 'lucide-react';
import type { PlanId } from '@/lib/plans';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
};

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free:       ['30 AI messages / month', '1 voice message / month', '10 email compose / month', 'Gmail + Calendar access', '1,000 char message limit'],
  standard:   ['150 AI messages / month', '15 voice messages / month', '50 email compose / month', 'Gmail + Calendar access', '2,000 char message limit', 'Email support'],
  premium:    ['500 AI messages / month', '30 voice messages / month', '150 email compose / month', 'Gmail + Calendar access', '5,000 char message limit', 'Priority support'],
  enterprise: ['Unlimited AI messages', 'Unlimited voice + compose', 'Custom char limit', 'Team seats + SSO', 'Dedicated support', 'Invoice billing (GST)'],
};

const PLAN_ACCENT: Record<PlanId, { bg: string; border: string; text: string; dot: string }> = {
  free:       { bg: 'bg-zinc-800/40',    border: 'border-zinc-700',     text: 'text-zinc-400',  dot: 'bg-zinc-500'  },
  standard:   { bg: 'bg-blue-500/5',     border: 'border-blue-500/25',  text: 'text-blue-400',  dot: 'bg-blue-400'  },
  premium:    { bg: 'bg-green-500/5',    border: 'border-green-500/25', text: 'text-green-400', dot: 'bg-green-400' },
  enterprise: { bg: 'bg-purple-500/5',   border: 'border-purple-500/25',text: 'text-purple-400',dot: 'bg-purple-400'},
};

function UsageCard({
  icon: Icon, label, used, limit, color,
}: {
  icon: React.ElementType; label: string; used: number; limit: number; color: string;
}) {
  const isUnlimited = limit === Infinity;
  const pct  = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const over = pct >= 80;
  const full = pct >= 100;

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
            <Icon size={13} />
          </div>
          <span className="text-xs font-medium text-zinc-300">{label}</span>
        </div>
        <span className={`text-xs font-mono tabular-nums font-semibold
          ${full ? 'text-red-400' : over ? 'text-yellow-400' : 'text-zinc-400'}`}>
          {used}{isUnlimited ? '' : `/${limit}`}
        </span>
      </div>

      {!isUnlimited ? (
        <>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                backgroundColor: full ? '#ef4444' : over ? '#eab308' : '#3b82f6',
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-600">{Math.round(pct)}% used this cycle</p>
        </>
      ) : (
        <p className="text-[10px] text-zinc-600">Unlimited</p>
      )}
    </div>
  );
}

export default function BillingPage() {
  const trpc         = useTRPC();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: authData } = useSession();
  const user = authData?.user as SessionUser | undefined;
  const isAdmin = user?.role === 'admin';

  const { data: plan, refetch } = useQuery({ ...trpc.plans.getMyPlan.queryOptions(), staleTime: 0 });
  const { data: orderHistory }  = useQuery(trpc.plans.getOrders.queryOptions());

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Plan upgraded successfully!');
      void refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const planId   = (plan?.planId  ?? 'free') as PlanId;
  const accent   = PLAN_ACCENT[planId];
  const features = PLAN_FEATURES[planId];
  const limits   = PLANS[planId];
  const PLAN_ORDER: PlanId[] = ['free', 'standard', 'premium', 'enterprise'];
  const isHigher = (t: PlanId) => PLAN_ORDER.indexOf(t) > PLAN_ORDER.indexOf(planId);
  const upgrades = (['standard', 'premium'] as PlanId[]).filter(isHigher);

  const resetDate = plan ? new Date(plan.resetAt) : null;
  const showReset = resetDate && resetDate.getFullYear() < 2090;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <SidebarNav user={user} isAdmin={isAdmin} />

      <div className="flex-1 overflow-y-auto bg-zinc-950">
        {/* Page header */}
        <div className="border-b border-zinc-800/60 px-8 h-14 flex items-center gap-3 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
          <CreditCard size={15} className="text-zinc-500" />
          <h1 className="text-sm font-semibold text-zinc-200">Billing & Plan</h1>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">

          {/* ── Active plan card ─────────────────────────────────────── */}
          <div className={`relative rounded-2xl border p-6 overflow-hidden ${accent.bg} ${accent.border}`}>
            {/* Subtle glow blob */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 bg-white pointer-events-none" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`w-2 h-2 rounded-full ${accent.dot} shadow-[0_0_6px_2px_currentColor] ${accent.text}`} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Current plan</span>
                </div>

                <div className="flex items-end gap-3 mb-1">
                  <h2 className="text-3xl font-bold tracking-tight">{plan?.planName ?? '—'}</h2>
                  {planId !== 'free' && (
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-1
                      ${accent.text} ${accent.border} ${accent.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${accent.dot} animate-pulse`} />
                      Active
                    </span>
                  )}
                </div>

                <p className={`text-2xl font-semibold mb-3 ${accent.text}`}>
                  {limits.priceInr === 0 ? 'Free forever'
                    : limits.priceInr === null ? 'Custom pricing'
                    : `₹${limits.priceInr} / month`}
                </p>

                {showReset && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Calendar size={11} />
                    Resets on {resetDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {planId !== 'enterprise' && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 text-xs font-semibold bg-white text-black px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors whitespace-nowrap"
                  >
                    <Zap size={12} />
                    {planId === 'free' ? 'Upgrade plan' : 'Change plan'}
                  </button>
                )}
                {planId !== 'free' && planId !== 'enterprise' && (
                  <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center">
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>

            {/* Included features */}
            <div className="mt-5 pt-5 border-t border-zinc-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">What&apos;s included</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckCircle size={11} className={`shrink-0 ${accent.text}`} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Usage this cycle ──────────────────────────────────────── */}
          {plan && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-300">Usage this cycle</h2>
                {showReset && (
                  <span className="text-[11px] text-zinc-600">
                    Resets {resetDate!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <UsageCard icon={MessageSquare} label="AI Messages"   used={plan.usage.messages.used} limit={plan.usage.messages.limit} color="bg-blue-500/15 text-blue-400"  />
                <UsageCard icon={Mic}           label="Voice Input"   used={plan.usage.voice.used}    limit={plan.usage.voice.limit}    color="bg-purple-500/15 text-purple-400" />
                <UsageCard icon={Pencil}        label="Email Compose" used={plan.usage.compose.used}  limit={plan.usage.compose.limit}  color="bg-green-500/15 text-green-400"  />
              </div>
            </div>
          )}

          {/* ── Upgrade section ───────────────────────────────────────── */}
          {upgrades.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Upgrade your plan</h2>
              <div className="space-y-2">
                {upgrades.map((p) => {
                  const l = PLANS[p];
                  const a = PLAN_ACCENT[p];
                  return (
                    <div key={p} className={`flex items-center justify-between rounded-xl border px-5 py-4 ${a.bg} ${a.border}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${a.border} ${a.bg}`}>
                          <Sparkles size={14} className={a.text} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-100">{l.name}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${a.text} ${a.border} ${a.bg}`}>
                              ₹{l.priceInr}/mo
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {l.messages} messages · {l.voice} voice · {l.compose} compose / month
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/pricing')}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors shrink-0"
                      >
                        Upgrade <ArrowRight size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Invoice / Payment history ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <CreditCard size={13} className="text-zinc-600" />
                Payment history
              </h2>
              <span className="text-[11px] text-zinc-600">Powered by Razorpay</span>
            </div>

            {!orderHistory || orderHistory.length === 0 ? (
              <div className="border border-zinc-800/60 rounded-2xl py-12 flex flex-col items-center gap-3 bg-zinc-950/40">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <CreditCard size={16} className="text-zinc-700" />
                </div>
                <p className="text-sm text-zinc-600 font-medium">No payments yet</p>
                <p className="text-xs text-zinc-700">Your invoices will appear here after your first payment</p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-4 px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  <span>Plan</span>
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {orderHistory.map((o, i) => (
                  <div
                    key={o.id}
                    className={`grid grid-cols-4 px-5 py-3.5 items-center text-sm transition-colors hover:bg-zinc-900/40
                      ${i !== orderHistory.length - 1 ? 'border-b border-zinc-800/60' : ''}`}
                  >
                    <span className="font-medium text-zinc-200 capitalize">{o.plan}</span>
                    <span className="text-zinc-500 text-xs">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-semibold text-white">₹{((o.amount ?? 0) / 100).toFixed(0)}</span>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full
                        ${o.status === 'paid'    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : o.status === 'failed'  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                        {o.status === 'paid' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                        {o.status}
                      </span>
                      {o.status === 'paid' && (
                        <button className="p-1 text-zinc-700 hover:text-zinc-400 transition-colors" title="View receipt">
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Security note ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800/40 bg-zinc-950/30">
            <Shield size={14} className="text-zinc-600 shrink-0" />
            <p className="text-xs text-zinc-600">
              Payments are securely processed by Razorpay. We never store your card details.
              All prices in INR, inclusive of applicable taxes.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
