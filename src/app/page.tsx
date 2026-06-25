'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, useSession } from '@/lib/auth-client';
import { ArrowRight, Calendar, Bot, Zap, Shield, Check, Sparkles, Loader2, Mail } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// Shared edge-highlight style used on every "card" element
const edgeShadow =
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_1px_0_0_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.6)]';

export default function LandingPage() {
  const [signingIn,   setSigningIn]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    void signIn.social({ provider: 'google', callbackURL: '/dashboard' });
  }

  function handleDemo() {
    if (demoLoading) return;
    setDemoLoading(true);
    window.location.href = '/api/demo';
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-x-hidden">
      <LandingNav onSignIn={handleSignIn} signingIn={signingIn} />
      <HeroSection   onSignIn={handleSignIn} signingIn={signingIn} onDemo={handleDemo} demoLoading={demoLoading} />
      <ProductMockup />
      <AgenticSection />
      <SectionDivider />
      <ManualMailSection />
      <SectionDivider />
      <DashboardSection />
      <SectionDivider />
      <CalendarSection />
      <SectionDivider />
      <FeaturesSection />
      <PricingSection onSignIn={handleSignIn} signingIn={signingIn} />
      <FAQSection />
      <CTASection onSignIn={handleSignIn} signingIn={signingIn} />
      <LandingFooter />
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav({ onSignIn, signingIn }: { onSignIn: () => void; signingIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300
      ${scrolled
        ? 'bg-black/70 backdrop-blur-xl border-b border-white/[0.07] shadow-[0_1px_24px_rgba(0,0,0,0.5)]'
        : 'bg-transparent backdrop-blur-none'}`}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        <div className="flex items-center">
          <Image
            src="https://res.cloudinary.com/sauravjha/image/upload/e_trim/v1782117736/yugati-dark-mode_xsais0.png"
            alt="Yugati"
            width={480}
            height={160}
            className="h-7 mt-2 w-auto object-contain block [html[data-theme='light']_&]:hidden"
          />
          <Image
            src="https://res.cloudinary.com/sauravjha/image/upload/e_trim/v1782117817/yugati-light-mode_sblh0y.png"
            alt="Yugati"
            width={480}
            height={160}
            className="h-6 mt-2 w-auto object-contain hidden [html[data-theme='light']_&]:block"
          />
        </div>

        {/* Center nav links */}
        <div className="hidden sm:flex items-center gap-6">
          {[
            { label: 'Features', href: '#features' },
            { label: 'Pricing',  href: '#pricing'  },
            { label: 'FAQ',      href: '#faq'       },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-zinc-500 hover:text-white transition-colors duration-150 relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white/40 transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
          <Link
            href="/docs"
            className="text-sm text-zinc-500 hover:text-white transition-colors duration-150 relative group"
          >
            Docs
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white/40 transition-all duration-200 group-hover:w-full" />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href="/dashboard/mail"
              className={`group flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold border border-white/20
                hover:-translate-y-px hover:shadow-[0_0_24px_rgba(255,255,255,0.18)]
                active:translate-y-0 active:shadow-none
                transition-all duration-150 ${edgeShadow}`}
            >
              Dashboard
              <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <button
                onClick={onSignIn}
                disabled={signingIn}
                className="text-sm text-zinc-500 hover:text-white transition-colors duration-150 relative group disabled:opacity-60"
              >
                Sign in
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white/60 transition-all duration-200 group-hover:w-full" />
              </button>

              <button
                onClick={onSignIn}
                disabled={signingIn}
                className={`group flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold border border-white/20
                  hover:-translate-y-px hover:shadow-[0_0_24px_rgba(255,255,255,0.18)]
                  active:translate-y-0 active:shadow-none disabled:opacity-70 disabled:hover:translate-y-0
                  transition-all duration-150 ${edgeShadow}`}
              >
                Get started<ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function ExtIcon({ src, size, style }: { src: string; size: number; style?: React.CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} style={{ display: 'block', ...style }} />
  );
}

// OpenAI mark — both variants always in HTML; CSS toggles visibility to avoid hydration mismatch.
function OpenAIIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <>
      {/* White logo — shown in dark mode (default) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/openai.png" alt="" width={size} height={size}
        className="block [html[data-theme='light']_&]:hidden"
        style={{ ...style }} />
      {/* Dark logo — shown in light mode */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/openai-dark.png" alt="" width={size} height={size}
        className="hidden [html[data-theme='light']_&]:block"
        style={{ ...style }} />
    </>
  );
}

function NextjsFloatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none">
      <circle cx="90" cy="90" r="90" fill="#000"/>
      <path d="M149.508 157.52L69.142 54H54V125.97H66.1416V69.3171L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="white"/>
      <rect x="115" y="54" width="12" height="72" fill="white"/>
    </svg>
  );
}


const GMAIL_ICON   = 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg';
const GCAL_ICON    = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg';
const PG_ICON      = 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg';
const CORSAIR_ICON = '/corsair-logo.png';

// Industry pattern (Resend / Clerk / WorkOS style):
//  • All icons inside identical pill cards: [icon 20px] [label]
//  • Uniform container, uniform opacity, symmetric columns
//  • Close to the headline — not banished to viewport edges
//  • Single subtle float, stagger only via delay

type FloatCard = { icon: React.ReactNode; label: string; delay: string; style: React.CSSProperties };

const ICON_SIZE = 20;

// Each card gets its own horizontal offset to break the straight-column look.
// Left side zigzags: close → far → middle (diagonal top-left to bottom-right arc)
// Right side mirrors with slight vertical offset for natural asymmetry.
const FLOAT_CARDS: FloatCard[] = [
  { icon: <ExtIcon src={GMAIL_ICON} size={ICON_SIZE} />,                             label: 'Gmail',    delay: '0s',    style: { top: '12%', left:  'calc(50% - 485px)' } },
  { icon: <NextjsFloatIcon size={ICON_SIZE} />,                                       label: 'Next.js',  delay: '-2.4s', style: { top: '42%', left:  'calc(50% - 605px)' } },
  { icon: <OpenAIIcon size={ICON_SIZE} style={{ borderRadius: 4 }} />, label: 'OpenAI',   delay: '-4.8s', style: { top: '72%', left:  'calc(50% - 520px)' } },
  { icon: <ExtIcon src={GCAL_ICON} size={ICON_SIZE} />,                               label: 'Calendar', delay: '-1.2s', style: { top: '12%', right: 'calc(50% - 465px)' } },
  { icon: <ExtIcon src={PG_ICON} size={ICON_SIZE} />,                                 label: 'Postgres', delay: '-3.6s', style: { top: '39%', right: 'calc(50% - 590px)' } },
  { icon: <ExtIcon src={CORSAIR_ICON} size={ICON_SIZE} />,                             label: 'Corsair',  delay: '-6s',   style: { top: '70%', right: 'calc(50% - 503px)' } },
];

function HeroSection({ onSignIn, signingIn, onDemo, demoLoading }: { onSignIn: () => void; signingIn: boolean; onDemo: () => void; demoLoading: boolean }) {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-44 pb-32">

      {/* Moving grid */}
      <div
        className="pointer-events-none absolute inset-0 animate-grid-move"
        style={{
          backgroundImage:
            'linear-gradient(to right,var(--grid-line) 1px,transparent 1px),linear-gradient(to bottom,var(--grid-line) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black to-transparent" />

      {/* Floating integration pill-cards — hidden below xl where calc goes negative */}
      {FLOAT_CARDS.map(({ icon, label, delay, style }, i) => (
        <div
          key={i}
          className="pointer-events-none absolute animate-float-a hidden xl:block opacity-70"
          style={{ ...style, animationDelay: delay }}
        >
          <div className="flex items-center gap-2 px-3 py-2
            bg-zinc-900/80 border border-white/[0.09] backdrop-blur-sm
            shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="shrink-0 flex items-center justify-center w-5 h-5">{icon}</span>
            <span className="text-[12px] font-medium text-zinc-400 whitespace-nowrap">{label}</span>
          </div>
        </div>
      ))}

      {/* Content */}
      <div className="relative flex flex-col items-center gap-7 max-w-4xl mx-auto">

        {/* Headline */}
        <div className="animate-fade-in-up delay-100">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.88]">
            Gmail. Calendar.
          </h1>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.88] text-zinc-500">
            One workspace.
          </h1>
        </div>

        {/* Sub */}
        <p className="animate-fade-in-up delay-200 text-zinc-500 text-lg sm:text-xl max-w-xl leading-relaxed">
          Yugati is your AI command center for Gmail and Google Calendar.
          Triage, reply, schedule, and search, all in one place.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onSignIn}
            disabled={signingIn}
            className={`group relative flex items-center gap-3 px-6 py-3 bg-white text-black font-semibold text-sm border border-white/20
              hover:-translate-y-px hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]
              active:translate-y-0 active:shadow-none disabled:opacity-70 disabled:hover:translate-y-0
              transition-all duration-150 overflow-hidden ${edgeShadow}`}
          >
            {/* shimmer sweep on hover */}
            <span className="pointer-events-none absolute inset-0
              bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)]
              opacity-0 group-hover:opacity-100
              [background-size:200%_100%] [background-position:-100%_0]
              group-hover:[background-position:200%_0]
              [transition:opacity_0.15s,background-position_0.5s]" />
            {signingIn ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon />
                Get started with Google
                <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <button
            onClick={onDemo}
            disabled={demoLoading}
            className="group flex items-center gap-2 px-5 py-3 border border-white/[0.08] text-zinc-500 text-sm font-medium
              hover:border-white/20 hover:text-white disabled:opacity-60
              active:bg-white/5 transition-all duration-150"
          >
            {demoLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Loading demo…
              </>
            ) : (
              <>
                Demo login
                <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors duration-150 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

      </div>
    </section>
  );
}

// ─── Product mockup ────────────────────────────────────────────────────────────

type MockEmail = { sender: string; subject: string; time: string; unread: boolean };

const FOLDER_EMAILS: Record<string, MockEmail[]> = {
  Primary: [
    { sender: 'Anthropic Team',  subject: 'The next Claude release is…',    time: 'Jun 14', unread: true  },
    { sender: 'GitHub',          subject: 'New pull request: feat/ai-chat', time: 'Jun 14', unread: true  },
    { sender: 'Notion',          subject: 'Your weekly digest is ready',    time: 'Jun 13', unread: false },
    { sender: 'Linear',          subject: '[Issue] Dashboard performance',  time: 'Jun 13', unread: false },
    { sender: 'Stripe',          subject: 'Your June invoice is ready',     time: 'Jun 12', unread: false },
    { sender: 'Vercel',          subject: 'Deployment successful ✓',        time: 'Jun 11', unread: false },
  ],
  Promotions: [
    { sender: 'Product Hunt',    subject: 'Top products this week 🚀',      time: 'Jun 14', unread: true  },
    { sender: 'Figma',           subject: 'What\'s new in Figma 2026',      time: 'Jun 13', unread: true  },
    { sender: 'Loom',            subject: 'Your free trial ends soon',      time: 'Jun 13', unread: false },
    { sender: 'Raycast',         subject: '5 extensions you\'ll love',      time: 'Jun 12', unread: false },
    { sender: 'Arc',             subject: 'Arc for Teams is here',          time: 'Jun 11', unread: false },
  ],
  Social: [
    { sender: 'X / Twitter',     subject: '@sama mentioned you in a post',  time: 'Jun 14', unread: true  },
    { sender: 'LinkedIn',        subject: '12 new profile views this week', time: 'Jun 13', unread: false },
    { sender: 'Luma',            subject: 'You\'re invited: AI Founders…',  time: 'Jun 12', unread: false },
    { sender: 'Substack',        subject: 'New post from Paul Graham',      time: 'Jun 11', unread: false },
  ],
  Updates: [
    { sender: 'GitHub Actions',  subject: 'Build passed: main → deploy',   time: 'Jun 14', unread: false },
    { sender: 'Vercel',          subject: 'Preview deployed for PR #42',    time: 'Jun 14', unread: false },
    { sender: 'Sentry',          subject: '3 new issues in production',     time: 'Jun 13', unread: true  },
    { sender: 'PagerDuty',       subject: '[RESOLVED] API latency spike',   time: 'Jun 12', unread: false },
  ],
  Sent: [
    { sender: 'To: alex@vc.com', subject: 'Re: Series A follow-up',        time: 'Jun 14', unread: false },
    { sender: 'To: team@…',      subject: 'Sprint goals for this week',     time: 'Jun 13', unread: false },
    { sender: 'To: press@…',     subject: 'Yugati launch announcement',     time: 'Jun 12', unread: false },
  ],
  Drafts: [
    { sender: 'Draft',           subject: 'Re: Partnership proposal',       time: 'Jun 14', unread: false },
    { sender: 'Draft',           subject: 'Investor update — June 2026',    time: 'Jun 12', unread: false },
  ],
  Spam: [
    { sender: 'no-reply@promo…', subject: 'You\'ve been selected!!!',       time: 'Jun 13', unread: true  },
    { sender: 'deals@shop…',     subject: 'LAST CHANCE 90% off',            time: 'Jun 11', unread: false },
  ],
};

const MOCK_CHAT = [
  { role: 'user', text: 'Summarise my unread emails',                                                                                                                             icon: null       },
  { role: 'ai',   text: 'You have 2 unread emails:\n1. Anthropic Team — new Claude release\n2. GitHub — PR review requested for feat/ai-chat',                                   icon: 'gmail'    },
  { role: 'user', text: 'Draft a reply to the GitHub one',                                                                                                                        icon: null       },
  { role: 'ai',   text: 'Sure! Here\'s a draft:\n\n"Thanks for the heads-up — I\'ll review it this afternoon. Looks like a clean implementation, I\'ll leave comments shortly."', icon: 'gmail'    },
];

const MOCK_EVENTS = [
  { title: 'Design sync',     time: '2:00 PM', hovered: false },
  { title: 'Sprint planning', time: '4:00 PM', hovered: false },
];

const INBOX_FOLDERS  = ['Primary', 'Promotions', 'Social', 'Updates'] as const;
const OTHER_FOLDERS  = ['Sent', 'Drafts', 'Spam'] as const;
type  Folder         = typeof INBOX_FOLDERS[number] | typeof OTHER_FOLDERS[number];

// Flowing dashed-line SVG paths — Corsair-style decorative arcs
function DashedPaths() {
  return (
    <svg
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      width="1600"
      height="600"
      style={{ top: '-60px' }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Top arc — flows left → right */}
      <path
        d="M-100,90 C180,10 420,170 720,70 S1020,190 1300,80 S1550,130 1700,95"
        fill="none"
        stroke="rgba(59,130,246,0.50)"
        strokeWidth="1.5"
        strokeDasharray="8 14"
        className="animate-dash-flow"
      />
      {/* Bottom arc — flows right → left */}
      <path
        d="M-100,510 C220,590 560,400 860,520 S1160,380 1460,490 S1650,450 1700,475"
        fill="none"
        stroke="rgba(59,130,246,0.44)"
        strokeWidth="1.5"
        strokeDasharray="8 14"
        className="animate-dash-flow-slow"
      />
    </svg>
  );
}

function ProductMockup() {
  const [activeFolder,  setActiveFolder]  = useState<Folder>('Primary');
  const [mode,          setMode]          = useState<'agentic' | 'manual'>('manual');
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [hoveredCal,    setHoveredCal]    = useState<number | null>(null);
  const [windowState,   setWindowState]   = useState<'normal' | 'minimized' | 'closed'>('normal');

  const emails = FOLDER_EMAILS[activeFolder] ?? [];

  function switchFolder(f: Folder) {
    setActiveFolder(f);
    setSelectedEmail(null);
  }

  return (
    <section className="relative px-4 sm:px-8 pb-32 flex justify-center overflow-visible">

      {/* Animated dashed arcs */}
      <DashedPaths />

      {/* Browser frame — no float, static and interactive */}
      <div className={`relative w-full max-w-5xl border border-white/[0.08]
        shadow-[0_40px_120px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden transition-all duration-300`}>

        {/* Chrome bar */}
        <div className="h-10 bg-zinc-950 flex items-center px-4 gap-3 border-b border-white/[0.06]">
          <div className="flex gap-1.5 group/traffic">
            <button
              onClick={() => setWindowState(windowState === 'closed' ? 'normal' : 'closed')}
              className="w-3 h-3 rounded-full bg-[#ff5f57] active:brightness-75 transition-all cursor-default flex items-center justify-center"
              title="Close"
            >
              <svg className="opacity-0 group-hover/traffic:opacity-100 transition-opacity" width="6" height="6" viewBox="0 0 6 6">
                <path d="M1 1l4 4M5 1L1 5" stroke="#7a1a14" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setWindowState(windowState === 'minimized' ? 'normal' : 'minimized')}
              className="w-3 h-3 rounded-full bg-[#febc2e] active:brightness-75 transition-all cursor-default flex items-center justify-center"
              title="Minimize"
            >
              <svg className="opacity-0 group-hover/traffic:opacity-100 transition-opacity" width="6" height="6" viewBox="0 0 6 6">
                <path d="M1 3h4" stroke="#7a5a00" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setWindowState('normal')}
              className="w-3 h-3 rounded-full bg-[#28c840] active:brightness-75 transition-all cursor-default flex items-center justify-center"
              title="Expand"
            >
              <svg className="opacity-0 group-hover/traffic:opacity-100 transition-opacity" width="6" height="6" viewBox="0 0 6 6">
                <path d="M1 5L5 1M1 1v4h4" stroke="#0a4a14" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 max-w-xs mx-auto">
            <div className="bg-zinc-900 border border-white/[0.05] h-6 flex items-center justify-center px-3">
              <span className="text-[11px] text-zinc-600">yugati.app/dashboard/mail</span>
            </div>
          </div>
        </div>

        {/* App UI */}
        {windowState === 'closed' ? (
          <div className="flex items-center justify-center bg-zinc-950" style={{ height: '400px' }}>
            <p className="text-[11px] text-zinc-700">Click the red dot to reopen</p>
          </div>
        ) : windowState === 'minimized' ? (
          <div className="flex items-center justify-center bg-zinc-950 border-t border-white/[0.04]" style={{ height: '36px' }}>
            <p className="text-[10px] text-zinc-700">Minimized — click yellow dot to restore</p>
          </div>
        ) : (
        <div className="flex bg-black" style={{ height: '400px' }}>

          {/* App sidebar */}
          <div className="w-40 bg-zinc-950 border-r border-white/[0.05] flex flex-col py-3 px-2 shrink-0">
            <div className="px-2 mb-4">
              <Image
                src="https://res.cloudinary.com/sauravjha/image/upload/e_trim/v1782117736/yugati-dark-mode_xsais0.png"
                alt="Yugati"
                width={480}
                height={160}
                className="h-5 w-auto object-contain"
              />
            </div>
            {(['Mail', 'Calendar'] as const).map((label) => (
              <div key={label}
                className={`flex items-center gap-2 px-2 py-1.5 mb-0.5 select-none rounded-md
                  ${label === 'Mail' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}
              >
                <div className={`w-2.5 h-2.5 ${label === 'Mail' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                <span className="text-[11px] font-medium">{label}</span>
                {label === 'Mail' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
              </div>
            ))}
          </div>

          {/* Folder nav — clickable */}
          <div className="w-36 bg-zinc-950/60 border-r border-white/[0.04] flex flex-col py-3 px-2 shrink-0">
            <p className="text-[9px] text-zinc-700 uppercase tracking-wider px-2 mb-1.5">Inbox</p>
            {INBOX_FOLDERS.map((f) => (
              <button
                key={f}
                onClick={() => switchFolder(f)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 mb-0.5 transition-colors duration-100
                  ${activeFolder === f ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/60'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${activeFolder === f ? 'bg-white/60' : 'bg-zinc-700'}`} />
                <span className="text-[10px] font-medium">{f}</span>
              </button>
            ))}
            <div className="mx-2 my-2 border-t border-white/[0.04]" />
            <p className="text-[9px] text-zinc-700 uppercase tracking-wider px-2 mb-1.5">Folders</p>
            {OTHER_FOLDERS.map((f) => (
              <button
                key={f}
                onClick={() => switchFolder(f)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 mb-0.5 transition-colors duration-100
                  ${activeFolder === f ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:text-zinc-500 hover:bg-zinc-900/40'}`}
              >
                <span className="text-[10px]">{f}</span>
              </button>
            ))}
          </div>

          {/* Center: email list or chat */}
          <div className="flex-1 flex flex-col border-r border-white/[0.04] min-w-0">

            {/* Mode toggle — clickable */}
            <div className="h-10 border-b border-white/[0.04] px-3 flex items-center gap-2.5 shrink-0">
              <div className="flex items-center bg-zinc-900 border border-white/[0.06] p-0.5 gap-0.5 rounded-lg">
                <button
                  onClick={() => setMode('agentic')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium transition-all rounded-md
                    ${mode === 'agentic' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  <Sparkles size={9} />
                  Agentic
                  {mode === 'agentic' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_3px_rgba(74,222,128,0.5)]" />}
                </button>
                <button
                  onClick={() => setMode('manual')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium transition-all rounded-md
                    ${mode === 'manual' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  <Mail size={9} />
                  Manual
                </button>
              </div>
              <span className="text-[9px] text-zinc-700">
                {mode === 'manual' ? `● ${activeFolder}` : '● AI assistant'}
              </span>
            </div>

            {/* Content area */}
            {mode === 'manual' ? (
              <div key={activeFolder} className="flex-1 overflow-hidden"
                style={{ animation: 'fade-in-up 0.18s ease-out both' }}>
                {emails.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedEmail(i === selectedEmail ? null : i)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.03] transition-colors duration-100
                      ${i === selectedEmail ? 'bg-zinc-800' : 'hover:bg-zinc-900/50'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.unread ? 'bg-white/70' : 'bg-transparent'}`} />
                    <span className={`text-[11px] w-24 shrink-0 truncate ${e.unread ? 'font-semibold text-white' : 'text-zinc-600'}`}>
                      {e.sender}
                    </span>
                    <span className={`flex-1 text-[11px] truncate ${e.unread ? 'text-zinc-300' : i === selectedEmail ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {e.subject}
                    </span>
                    <span className="text-[10px] text-zinc-700 shrink-0">{e.time}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div key="chat" className="flex-1 overflow-hidden px-3 py-3 space-y-3"
                style={{ animation: 'fade-in-up 0.18s ease-out both' }}>
                {MOCK_CHAT.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[80%] px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line
                      ${msg.role === 'user'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-zinc-950 border border-white/[0.06] text-zinc-400'
                      }`}
                    >
                      {msg.icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.icon === 'gmail' ? GMAIL_ICON : GCAL_ICON}
                          alt={msg.icon}
                          width={10}
                          height={10}
                          className="absolute top-1.5 right-1.5 opacity-70"
                        />
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar mini — hoverable dates */}
          <div className="w-48 bg-zinc-950/70 flex flex-col shrink-0">
            <div className="px-3 pt-3 pb-2 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-zinc-400">June 2026</span>
                <div className="flex gap-1 text-zinc-700 text-[10px]">‹ ›</div>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[9px] text-zinc-700">{d}</div>
                ))}
              </div>
              {[[1,2,3,4,5,6,7],[8,9,10,11,12,13,14],[15,16,17,18,19,20,21]].map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((day) => (
                    <div
                      key={day}
                      onMouseEnter={() => setHoveredCal(day)}
                      onMouseLeave={() => setHoveredCal(null)}
                      className={`text-center py-0.5 text-[10px] mx-auto w-5 h-5 flex items-center justify-center cursor-default transition-colors duration-100
                        ${day === 14
                          ? 'bg-white text-black font-bold'
                          : hoveredCal === day
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'text-zinc-700'
                        }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex-1 px-3 pt-2">
              <p className="text-[9px] text-zinc-700 uppercase tracking-wider mb-2">Upcoming</p>
              {MOCK_EVENTS.map((ev) => (
                <div key={ev.title} className="flex items-start gap-1.5 mb-2 group/ev cursor-default">
                  <div className="w-1 h-1 rounded-full bg-white/30 mt-1 shrink-0 group-hover/ev:bg-white/60 transition-colors" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-medium group-hover/ev:text-zinc-300 transition-colors">{ev.title}</p>
                    <p className="text-[9px] text-zinc-700">{ev.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center justify-center gap-1 w-full py-1.5 border border-white/[0.06] text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.1] transition-colors cursor-default">
                Open Calendar
              </div>
            </div>
          </div>

        </div>
        )}
      </div>
    </section>
  );
}

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="border-t border-white/[0.04]" />
    </div>
  );
}

// ─── Agentic Showcase ─────────────────────────────────────────────────────────

const AGENTIC_MSGS = [
  { role: 'user', text: 'Summarise my unread emails',                                                                                                                                         icon: null       },
  { role: 'ai',   text: 'You have 12 unread emails. Highlights:\n• 3 investor threads need replies\n• 2 GitHub PRs awaiting your review\n• Stripe invoice ready — $240',                      icon: 'gmail'    },
  { role: 'user', text: 'Draft a reply to the Anthropic thread',                                                                                                                              icon: null       },
  { role: 'ai',   text: '"Thanks for the heads-up on the new release — excited to integrate this. I\'ll update the pipeline by EOD and report back."',                                        icon: 'gmail'    },
  { role: 'user', text: 'Book a 30-min call with Alex on Thursday 3 PM',                                                                                                                     icon: null       },
  { role: 'ai',   text: 'Done ✓  Created "Call with Alex" — Thu Jun 19 · 3:00–3:30 PM\nGoogle Meet link added · Invite sent to alex@vc.com',                                                 icon: 'calendar' },
];

function AgenticSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 w-full">
      <div className="grid lg:grid-cols-2 gap-20 items-center">

        {/* Left: text */}
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
            Agentic Mode
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Your inbox<br /><span className="text-zinc-500">answers back.</span>
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed mb-10 max-w-[340px]">
            Ask anything in plain English. Yugati reads your Gmail, drafts replies, books meetings, and takes action. All without leaving the page.
          </p>
          <div className="space-y-5">
            {[
              ['Summarise threads', 'Get the gist of 40 emails in one sentence'],
              ['Draft & send replies', 'AI writes in your voice, you approve with one click'],
              ['Book meetings instantly', 'Create calendar events from natural language'],
              ['Search across everything', 'Find that email from six months ago in seconds'],
            ].map(([label, desc]) => (
              <div key={label} className="flex items-start gap-3.5">
                <div className="mt-0.5 w-5 h-5 border border-green-500/30 bg-green-500/10 flex items-center justify-center shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat mockup */}
        <div className={`relative border border-white/[0.08] bg-zinc-950 overflow-hidden ${edgeShadow}`}>
          {/* ambient glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-green-500/[0.07] rounded-full blur-3xl" />

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.06]">
            <OpenAIIcon size={16} style={{ borderRadius: 3, opacity: 0.8 }} />
            <span className="text-xs font-semibold text-zinc-300">Agentic</span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.7)]" />
              Active
            </span>
          </div>

          {/* Messages */}
          <div className="px-4 py-4 space-y-3 overflow-hidden" style={{ maxHeight: 320 }}>
            {AGENTIC_MSGS.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[88%] px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-line
                  ${msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'bg-black border border-white/[0.07] text-zinc-400'}`}>
                  {msg.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.icon === 'gmail' ? GMAIL_ICON : GCAL_ICON}
                      alt={msg.icon}
                      width={12}
                      height={12}
                      className="absolute top-2 right-2 opacity-75"
                    />
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-black border border-white/[0.07] px-3.5 py-3">
              <span className="flex-1 text-[11px] text-zinc-700">Ask about your inbox…</span>
              <div className="w-6 h-6 border border-white/[0.08] bg-white/5 flex items-center justify-center">
                <ArrowRight size={10} className="text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Manual Mail Showcase ─────────────────────────────────────────────────────

const MAIL_FEATURES = [
  {
    title: 'Every folder, live',
    desc:  'Primary, Promotions, Social, Updates, Sent, Drafts, Spam. Every Gmail label synced in real time.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M1.5 6.5l7.5 4.5 7.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Rich compose',
    desc:  'Bold, italic, links, bullet lists, inline images. A full-featured editor that lives in the panel.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 13.5L6 3l3 7.5L12 3l3 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.5 10.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Thread view',
    desc:  'Full conversation history, timestamps, and quick reply. All inline without opening a new tab.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 5h12M3 9h9M3 13h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Auto-categorised',
    desc:  'Emails land in the right place automatically. No rules, no filters to configure.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5L2 5v8l7 3.5 7-3.5V5L9 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M9 1.5v14M2 5l7 3.5 7-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Instant search',
    desc:  'Search by sender, subject, keyword, or date. Across your entire mailbox, in milliseconds.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'One-click reply',
    desc:  'Open a thread and reply inline. No popups, no new tabs. Just fast.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9l4-4v2.5c5 0 8 2 8 7-1.5-3.5-4-4.5-8-4.5V12L3 9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
] as const;

function ManualMailSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 w-full">
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 mb-7">
          Inbox
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Full Gmail control.<br /><span className="text-zinc-500">Zero compromise.</span>
        </h2>
        <p className="text-zinc-500 text-base max-w-md mx-auto leading-relaxed">
          Every folder, every thread, rich compose. Your entire inbox reimagined in one clean panel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
        {MAIL_FEATURES.map(({ title, desc, icon }) => (
          <div key={title} className={`group bg-black p-8 hover:bg-zinc-950 transition-colors duration-200 ${edgeShadow}`}>
            <div className="w-9 h-9 border border-white/[0.08] bg-zinc-950 flex items-center justify-center mb-6
              text-zinc-600 group-hover:text-zinc-300 group-hover:border-white/15 transition-all duration-200
              shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {icon}
            </div>
            <p className="text-sm font-semibold text-white mb-2.5">{title}</p>
            <p className="text-sm text-zinc-600 leading-relaxed group-hover:text-zinc-500 transition-colors duration-200">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Dashboard Showcase ───────────────────────────────────────────────────────

const DASH_STATS = [
  { label: 'Emails this week', val: '127', delta: '+14% vs last week' },
  { label: 'Avg. response',    val: '2.4h', delta: '−18 min faster'   },
  { label: 'Events this week', val: '9',   delta: '3 with Meet'       },
  { label: 'Unread',           val: '12',  delta: '4 need action'     },
] as const;

const DASH_CATEGORIES = [
  { label: 'Work',    pct: 42, color: '#3b82f6' },
  { label: 'Finance', pct: 23, color: '#8b5cf6' },
  { label: 'Social',  pct: 19, color: '#22c55e' },
  { label: 'Updates', pct: 16, color: '#f59e0b' },
] as const;

const DASH_SENDERS = [
  { name: 'GitHub',   pct: 88, initial: 'G' },
  { name: 'Notion',   pct: 67, initial: 'N' },
  { name: 'Stripe',   pct: 52, initial: 'S' },
  { name: 'Vercel',   pct: 38, initial: 'V' },
] as const;

const EMAIL_VOL = [12, 28, 18, 35, 22, 8, 5];
const HOURLY    = [1,1,1,1,2,6,12,18,24,30,28,22,20,26,30,34,28,18,14,10,7,4,2,1];
const DOW_LABELS = ['M','T','W','T','F','S','S'];

function DashboardSection() {
  const volMax  = Math.max(...EMAIL_VOL);
  const hourMax = Math.max(...HOURLY);

  return (
    <section className="max-w-6xl mx-auto px-6 py-24 w-full">
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 mb-7">
          Insights
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Every metric<br /><span className="text-zinc-500">at a glance.</span>
        </h2>
        <p className="text-zinc-500 text-base max-w-md mx-auto leading-relaxed">
          Yugati tracks email volume, response patterns, top senders, and calendar load. Refreshed every minute.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {DASH_STATS.map(({ label, val, delta }) => (
          <div key={label} className={`bg-zinc-950 border border-white/[0.07] p-5 ${edgeShadow}`}>
            <p className="text-xs text-zinc-600 mb-3 leading-snug">{label}</p>
            <p className="text-3xl font-bold text-white tracking-tight">{val}</p>
            <p className="text-[11px] text-zinc-700 mt-2">{delta}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Email volume + categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Email volume bar chart */}
        <div className={`sm:col-span-2 bg-zinc-950 border border-white/[0.07] p-5 ${edgeShadow}`}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold text-zinc-400">Email Volume This Week</p>
            <span className="text-[10px] text-zinc-700 bg-zinc-900 border border-white/[0.05] px-2 py-1">Mon – Sun</span>
          </div>
          <div className="flex items-end gap-2 h-20 mb-2">
            {EMAIL_VOL.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-zinc-700">{v}</span>
                <div
                  className={`w-full rounded-sm transition-all ${i === 3 ? 'bg-blue-500' : 'bg-zinc-800'}`}
                  style={{ height: `${(v / volMax) * 56}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {DOW_LABELS.map((d, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-zinc-700">{d}</div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className={`bg-zinc-950 border border-white/[0.07] p-5 ${edgeShadow}`}>
          <p className="text-xs font-semibold text-zinc-400 mb-5">By Category</p>
          <div className="space-y-3.5">
            {DASH_CATEGORIES.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-zinc-500">{label}</span>
                  <span className="text-[11px] text-zinc-600">{pct}%</span>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top senders + hourly pattern */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Top senders */}
        <div className={`bg-zinc-950 border border-white/[0.07] p-5 ${edgeShadow}`}>
          <p className="text-xs font-semibold text-zinc-400 mb-5">Top Senders</p>
          <div className="space-y-4">
            {DASH_SENDERS.map(({ name, pct, initial }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-zinc-400 truncate">{name}</span>
                    <span className="text-[10px] text-zinc-700 shrink-0 ml-2">{pct}%</span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly activity */}
        <div className={`sm:col-span-2 bg-zinc-950 border border-white/[0.07] p-5 ${edgeShadow}`}>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold text-zinc-400">Activity by Hour</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-500/60" />
              <span className="text-[10px] text-zinc-700">Peak hours</span>
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-16 mb-2">
            {HOURLY.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${(i >= 8 && i <= 17) ? 'bg-blue-500/60' : 'bg-zinc-800'}`}
                style={{ height: `${(v / hourMax) * 64}px` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {['12am', '6am', '12pm', '6pm', '12am'].map((t, i) => (
              <span key={i} className="text-[9px] text-zinc-700">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Calendar Showcase ────────────────────────────────────────────────────────

const CAL_EVENTS_MOCK = [
  { title: 'Design sync',     time: '10:00 AM', dur: '30m', color: '#3b82f6', attendees: 4  },
  { title: 'Investor call',   time: '2:00 PM',  dur: '1h',  color: '#8b5cf6', attendees: 2  },
  { title: 'Sprint planning', time: '4:00 PM',  dur: '1h',  color: '#22c55e', attendees: 8  },
] as const;

function CalendarSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 w-full">
      <div className="grid lg:grid-cols-2 gap-20 items-center">

        {/* Left: calendar mockup */}
        <div className={`relative border border-white/[0.08] bg-zinc-950 overflow-hidden ${edgeShadow}`}>
          {/* ambient glow */}
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/[0.07] rounded-full blur-3xl" />

          {/* Month header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-zinc-300">June 2026</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-600 bg-zinc-900 border border-white/[0.06] px-2.5 py-1">Today</span>
              <div className="flex gap-1 text-[12px] text-zinc-600">
                <button className="w-6 h-6 flex items-center justify-center border border-white/[0.05] hover:text-zinc-300 transition-colors">‹</button>
                <button className="w-6 h-6 flex items-center justify-center border border-white/[0.05] hover:text-zinc-300 transition-colors">›</button>
              </div>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.04]">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="py-2 text-center text-[10px] text-zinc-700 font-medium tracking-wide">{d}</div>
            ))}
          </div>

          {/* Calendar days — June 2026 starts on Monday (pad 1 Sunday) */}
          <div className="grid grid-cols-7">
            <div className="h-10 border-b border-r border-white/[0.03]" />
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <div
                key={day}
                className={`relative h-10 border-b border-r border-white/[0.03] flex items-end justify-end px-1.5 pb-1 text-[10px]
                  ${day === 15 ? 'bg-white/[0.03]' : ''}
                  ${day === 19 ? 'bg-blue-500/[0.08]' : ''}`}
              >
                <span className={
                  day === 15 ? 'w-5 h-5 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]' :
                  day === 19 ? 'text-blue-400 font-semibold' :
                  'text-zinc-700'
                }>{day}</span>
                {[8, 12, 19].includes(day) && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500/60" />
                    {day === 19 && <><span className="w-1 h-1 rounded-full bg-purple-500/60" /><span className="w-1 h-1 rounded-full bg-green-500/60" /></>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Events list */}
          <div className="px-5 py-4">
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider font-semibold mb-3">Thu, Jun 19 · 3 events</p>
            <div className="space-y-2">
              {CAL_EVENTS_MOCK.map((ev) => (
                <div key={ev.title} className="flex items-center gap-3 px-3 py-2.5 bg-black/40 border border-white/[0.05]">
                  <div className="w-1 h-9 rounded-full shrink-0 opacity-80" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-zinc-300 truncate">{ev.title}</p>
                    <p className="text-[10px] text-zinc-600">{ev.time} · {ev.dur}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-700 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1"/>
                      <path d="M1.5 9c0-1.657 1.567-3 3.5-3s3.5 1.343 3.5 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    {ev.attendees}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: text */}
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 mb-7">
            Calendar
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Your schedule,<br /><span className="text-zinc-500">always in view.</span>
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed mb-10 max-w-[340px]">
            See your calendar right next to your inbox. Create events, invite attendees, and add Google Meet without switching apps.
          </p>
          <div className="space-y-5">
            {[
              ['Create events naturally', 'Type "lunch with Alex tomorrow at 1pm" and it\'s done'],
              ['See conflicts instantly', 'Unavailable slots highlighted before you book'],
              ['Google Meet built in', 'Every event gets a video link, automatically'],
              ['AI schedules for you', 'Ask Yugati to find a free slot and send the invite'],
            ].map(([label, desc]) => (
              <div key={label} className="flex items-start gap-3.5">
                <div className="mt-0.5 w-5 h-5 border border-blue-500/30 bg-blue-500/10 flex items-center justify-center shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:  Bot,
    label: 'AI chat built in',
    desc:  'Ask anything about your inbox. Summarise threads, draft replies, find that email from 6 months ago, all in plain language.',
  },
  {
    icon:  Zap,
    label: 'Instant triage',
    desc:  'Primary, Promotions, Social, Updates, auto-sorted on arrival. Toggle between Manual and AI Chat with a single click.',
  },
  {
    icon:  Calendar,
    label: 'Calendar, right there',
    desc:  'Your schedule lives in the same view as your inbox. See conflicts, create events, open Google Calendar in one click.',
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 pb-28 w-full">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-4">Why Yugati</p>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Built for how you
          <br />
          <span className="text-zinc-600">actually work.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.05]">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className={`group bg-black p-8
              hover:bg-zinc-950
              transition-colors duration-200 ${edgeShadow}`}
          >
            <div className="w-9 h-9 border border-white/[0.08] bg-zinc-950 flex items-center justify-center mb-6
              group-hover:border-white/15 transition-colors duration-200
              shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Icon size={16} className="text-zinc-400 group-hover:text-white transition-colors duration-200" />
            </div>

            <p className="font-semibold text-sm mb-3 text-white">{label}</p>
            <p className="text-zinc-600 text-sm leading-relaxed group-hover:text-zinc-500 transition-colors duration-200">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing preview ───────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Get started, no card needed.',
    features: ['30 AI messages / month', '1 voice message', '10 email compose', 'Gmail + Calendar', '1,000 char limit'],
    cta: 'Start for free',
    highlight: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '₹199',
    period: '/ month',
    desc: 'For individuals who move fast.',
    features: ['150 AI messages / month', '15 voice messages', '50 email compose', 'Gmail + Calendar', '2,000 char limit', 'Email support'],
    cta: 'Get Standard',
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₹499',
    period: '/ month',
    desc: 'For power users and teams.',
    features: ['500 AI messages / month', '30 voice messages', '150 email compose', 'Gmail + Calendar', '5,000 char limit', 'Priority support'],
    cta: 'Get Premium',
    highlight: true,
  },
] as const;

function PricingSection({ onSignIn, signingIn }: { onSignIn: () => void; signingIn: boolean }) {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 pb-28 w-full">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-4">Pricing</p>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Simple, transparent <span className="text-zinc-600">pricing.</span>
        </h2>
        <p className="text-zinc-600 text-base max-w-sm mx-auto mt-5 leading-relaxed">
          Start free. Upgrade when you need more. Cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative flex flex-col border p-6 transition-all duration-200
              ${tier.highlight
                ? 'border-white/20 bg-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.04)]'
                : 'border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700/60'}`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                  <Sparkles size={9} />
                  Most popular
                </span>
              </div>
            )}

            <div className="mb-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{tier.name}</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
                <span className="text-zinc-600 text-sm mb-1">{tier.period}</span>
              </div>
              <p className="text-xs text-zinc-600">{tier.desc}</p>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check size={11} className="text-zinc-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={onSignIn}
              disabled={signingIn}
              className={`w-full py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70
                ${tier.highlight
                  ? 'bg-white text-black hover:bg-zinc-100'
                  : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800 hover:text-white'}`}
            >
              {signingIn ? <><Loader2 size={14} className="animate-spin" />Signing in…</> : tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Enterprise strip */}
      <div className={`flex items-center justify-between px-6 py-4 border border-zinc-800/60 bg-zinc-950/30 ${edgeShadow}`}>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 border border-zinc-700/60 bg-zinc-900 flex items-center justify-center">
            <Sparkles size={14} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Enterprise</p>
            <p className="text-xs text-zinc-600">Unlimited usage · team seats · SSO · dedicated support · GST invoices</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          See all plans <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
}

// ─── Bottom CTA ────────────────────────────────────────────────────────────────

function CTASection({ onSignIn, signingIn }: { onSignIn: () => void; signingIn: boolean }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-28 w-full">
      <div className={`relative border border-white/[0.07] bg-zinc-950 overflow-hidden p-16 text-center ${edgeShadow}`}>

        {/* Moving grid inside the card */}
        <div
          className="pointer-events-none absolute inset-0 animate-grid-move"
          style={{
            backgroundImage:
              'linear-gradient(to right,rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.018) 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />

        <div className="relative z-10">
          <p className="text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-5">Get started free</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Ready to move faster?
          </h2>
          <p className="text-zinc-600 text-base max-w-md mx-auto mb-10 leading-relaxed">
            Connect your Gmail and Google Calendar in 30 seconds.
            No credit card, no setup, no friction.
          </p>

          <button
            onClick={onSignIn}
            disabled={signingIn}
            className={`group relative inline-flex items-center gap-3 px-7 py-3.5 bg-white text-black font-semibold text-sm border border-white/20
              hover:-translate-y-px hover:shadow-[0_0_40px_rgba(255,255,255,0.22)]
              active:translate-y-0 active:shadow-none disabled:opacity-70 disabled:hover:translate-y-0
              transition-all duration-150 overflow-hidden ${edgeShadow}`}
          >
            <span className="pointer-events-none absolute inset-0
              bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)]
              opacity-0 group-hover:opacity-100
              [background-size:200%_100%] [background-position:-100%_0]
              group-hover:[background-position:200%_0]
              [transition:opacity_0.15s,background-position_0.5s]" />
            {signingIn ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
                <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What is Yugati?',
    a: 'Yugati is an AI-powered productivity suite that connects to your Gmail and Google Calendar. It handles email drafting, event scheduling, and complex tasks through a conversational agent, so you can focus on what matters.',
  },
  {
    q: 'How do I connect Gmail and Google Calendar?',
    a: 'Go to Settings → Integrations in your dashboard and click Connect next to Gmail or Google Calendar. You\'ll be redirected through a secure Google OAuth flow. Yugati only requests the minimum scopes it needs (read + compose for Gmail, read/write for Calendar).',
  },
  {
    q: 'Is my data safe and private?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Yugati never stores your email content beyond what\'s needed for the current session. Your OAuth tokens are encrypted server-side and never exposed to the client or third parties.',
  },
  {
    q: 'What can the AI agent actually do?',
    a: 'The agent can draft and send emails on your behalf, summarise inboxes, find and create calendar events, handle multi-step tasks like scheduling meetings across time zones, and compose context-aware replies, all through natural conversation.',
  },
  {
    q: "What's the difference between Guided and Auto mode?",
    a: "Guided mode (default) shows you what the agent plans to do and asks for confirmation before any action. Auto mode lets the agent complete tasks end-to-end without interruptions, ideal once you're comfortable with its judgment.",
  },
  {
    q: 'What AI models power Yugati?',
    a: 'The core agent runs on GPT-4.1 with a fast GPT-4.1-mini enhancer pass for prompt refinement. Voice transcription uses OpenAI Whisper. The pipeline is designed so model upgrades happen transparently as better versions become available.',
  },
  {
    q: 'How does billing work?',
    a: 'Yugati uses Razorpay for secure payment processing. Plans are billed monthly and auto-renew. Usage (messages, voice, compose) resets at the start of each billing period. You can upgrade at any time and the new limits apply immediately.',
  },
  {
    q: 'Can I use Yugati on mobile?',
    a: 'Yugati is a fully responsive web app that works in any modern mobile browser. A dedicated mobile app is on the roadmap. For now, adding the site to your home screen gives you an app-like experience.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Dashboard → Billing and click Cancel Plan. Your plan stays active until the end of the current billing period, then reverts to the free tier. No cancellation fees, no hassle.',
  },
  {
    q: 'What happens if I hit my usage limit?',
    a: "You'll see a clear error message in the chat. You can either wait for your monthly reset or upgrade your plan instantly from the Billing page. Existing conversations and data are never affected by usage limits.",
  },
];

function FAQSection() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-4">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Common questions
          </h2>
          <p className="text-zinc-500 text-base">
            Everything you need to know before getting started.{' '}
            <Link href="/docs" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
              Read the full docs →
            </Link>
          </p>
        </div>

        {/* Accordion */}
        <FAQList />
      </div>
    </section>
  );
}

function FAQList() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-px">
      {FAQ_ITEMS.map(({ q, a }, i) => (
        <div
          key={i}
          className="border border-white/[0.06] bg-white/[0.02] overflow-hidden first:rounded-t-xl last:rounded-b-xl"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-zinc-200 hover:text-white transition-colors"
          >
            {q}
            <span className={`shrink-0 w-4 h-4 text-zinc-600 transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v12M2 8h12" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-zinc-500 leading-relaxed border-t border-white/[0.04]">
              <p className="pt-4">{a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.05] py-6">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-white flex items-center justify-center">
            <span className="text-black text-[9px] font-black">Y</span>
          </div>
          <span className="text-xs text-zinc-700 font-medium">Yugati</span>
          <span className="text-zinc-800 mx-1">·</span>
          <span className="text-xs text-zinc-800">© 2026</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-700">
            <Shield size={11} />
            End-to-end encrypted
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-4 text-xs text-zinc-700">
            <Link href="/docs" className="hover:text-zinc-400 transition-colors">Docs</Link>
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
