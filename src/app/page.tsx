'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { ArrowRight, Calendar, Bot, Zap, Shield } from 'lucide-react';

// Shared edge-highlight style used on every "card" element
const edgeShadow =
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_1px_0_0_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.6)]';

export default function LandingPage() {
  function handleSignIn() {
    void signIn.social({ provider: 'google', callbackURL: '/dashboard' });
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-x-hidden">
      <LandingNav onSignIn={handleSignIn} />
      <HeroSection   onSignIn={handleSignIn} />
      <ProductMockup />
      <FeaturesSection />
      <CTASection onSignIn={handleSignIn} />
      <LandingFooter />
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav({ onSignIn }: { onSignIn: () => void }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black tracking-tight">Y</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Yugati</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={onSignIn}
            className="text-sm text-zinc-500 hover:text-white transition-colors duration-150 relative group"
          >
            Sign in
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-white/60 transition-all duration-200 group-hover:w-full" />
          </button>

          <button
            onClick={onSignIn}
            className={`group flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold border border-white/20
              hover:-translate-y-px hover:shadow-[0_0_24px_rgba(255,255,255,0.18)]
              active:translate-y-0 active:shadow-none
              transition-all duration-150 ${edgeShadow}`}
          >
            Get started
            <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function ExtIcon({ src, size }: { src: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} style={{ display: 'block' }} />
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


const GMAIL_ICON = 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg';
const GCAL_ICON  = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg';
const PG_ICON    = 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg';
const CORSAIR_ICON = '/corsair-logo.png';

type FloatIconDef = { render: (s: number) => React.ReactNode; size: number; opacity: number; cls: string; delay?: string; style: React.CSSProperties };
const FLOAT_ICONS: FloatIconDef[] = [
  { render: (s) => <ExtIcon src={GMAIL_ICON}    size={s} />, size: 58, opacity: 0.60, cls: 'animate-float-a',               style: { top: '20%', left:  '13%' } },
  { render: (s) => <ExtIcon src={GCAL_ICON}     size={s} />, size: 54, opacity: 0.55, cls: 'animate-float-b',               style: { top: '17%', right: '13%' } },
  { render: (s) => <NextjsFloatIcon             size={s} />, size: 54, opacity: 0.58, cls: 'animate-float-c',               style: { top: '46%', left:  '11%' } },
  { render: (s) => <ExtIcon src={PG_ICON}       size={s} />, size: 52, opacity: 0.52, cls: 'animate-float-a', delay: '-3s', style: { top: '44%', right: '11%' } },
  { render: (s) => <ExtIcon src="/openai.png"    size={s} />, size: 48, opacity: 0.46, cls: 'animate-float-b', delay: '-2s', style: { top: '70%', left:  '12%' } },
  { render: (s) => <ExtIcon src={CORSAIR_ICON}  size={s} />, size: 46, opacity: 0.50, cls: 'animate-float-c', delay: '-5s', style: { top: '68%', right: '12%' } },
];

function HeroSection({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-44 pb-32 overflow-hidden">

      {/* Moving grid */}
      <div
        className="pointer-events-none absolute inset-0 animate-grid-move"
        style={{
          backgroundImage:
            'linear-gradient(to right,rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.055) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black to-transparent" />

      {/* Floating tech stack icons — at the edges, not overlapping headline */}
      {FLOAT_ICONS.map(({ render, size, opacity, cls, delay, style }, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute ${cls}`}
          style={{ ...style, opacity, animationDelay: delay }}
        >
          {render(size)}
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
          Yugati is your AI command center for Gmail and Google Calendar —
          triage, reply, schedule, and search, all in one place.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onSignIn}
            className={`group relative flex items-center gap-3 px-6 py-3 bg-white text-black font-semibold text-sm border border-white/20
              hover:-translate-y-px hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]
              active:translate-y-0 active:shadow-none
              transition-all duration-150 overflow-hidden ${edgeShadow}`}
          >
            {/* shimmer sweep on hover */}
            <span className="pointer-events-none absolute inset-0
              bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)]
              opacity-0 group-hover:opacity-100
              [background-size:200%_100%] [background-position:-100%_0]
              group-hover:[background-position:200%_0]
              [transition:opacity_0.15s,background-position_0.5s]" />
            <GoogleIcon />
            Get started with Google
            <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>

          <button className="group flex items-center gap-2 px-5 py-3 border border-white/[0.08] text-zinc-500 text-sm font-medium
            hover:border-white/20 hover:text-white
            active:bg-white/5
            transition-all duration-150">
            See how it works
            <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors duration-150 group-hover:translate-x-0.5 transition-transform" />
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
  { role: 'user', text: 'Summarise my unread emails' },
  { role: 'ai',   text: 'You have 2 unread emails:\n1. Anthropic Team — new Claude release\n2. GitHub — PR review requested for feat/ai-chat' },
  { role: 'user', text: 'Draft a reply to the GitHub one' },
  { role: 'ai',   text: 'Sure! Here\'s a draft:\n\n"Thanks for the heads-up — I\'ll review it this afternoon. Looks like a clean implementation, I\'ll leave comments shortly."' },
];

const MOCK_EVENTS = [
  { title: 'Design sync',     time: '2:00 PM', hovered: false },
  { title: 'Sprint planning', time: '4:00 PM', hovered: false },
];

const INBOX_FOLDERS  = ['Primary', 'Promotions', 'Social', 'Updates'] as const;
const OTHER_FOLDERS  = ['Sent', 'Drafts', 'Spam'] as const;
const ALL_FOLDERS    = [...INBOX_FOLDERS, ...OTHER_FOLDERS] as const;
type  Folder         = typeof ALL_FOLDERS[number];

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
      {/* Second top arc, slightly offset */}
      <path
        d="M-100,115 C200,38 460,195 760,95 S1060,215 1340,105 S1570,150 1700,118"
        fill="none"
        stroke="rgba(59,130,246,0.24)"
        strokeWidth="1"
        strokeDasharray="8 14"
        className="animate-dash-flow"
        style={{ animationDelay: '-1.4s' }}
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
      {/* Second bottom arc */}
      <path
        d="M-100,535 C240,612 580,422 880,542 S1180,402 1480,512 S1660,474 1700,498"
        fill="none"
        stroke="rgba(59,130,246,0.20)"
        strokeWidth="1"
        strokeDasharray="8 14"
        className="animate-dash-flow-slow"
        style={{ animationDelay: '-2.2s' }}
      />
    </svg>
  );
}

function ProductMockup() {
  const [activeFolder,  setActiveFolder]  = useState<Folder>('Primary');
  const [mode,          setMode]          = useState<'manual' | 'chat'>('manual');
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [hoveredCal,    setHoveredCal]    = useState<number | null>(null);

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
        shadow-[0_40px_120px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden`}>

        {/* Chrome bar */}
        <div className="h-10 bg-zinc-950 flex items-center px-4 gap-3 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
          </div>
          <div className="flex-1 max-w-xs mx-auto">
            <div className="bg-zinc-900 border border-white/[0.05] h-6 flex items-center justify-center px-3">
              <span className="text-[11px] text-zinc-600">yugati.app/dashboard/mail</span>
            </div>
          </div>
        </div>

        {/* App UI */}
        <div className="flex bg-black" style={{ height: '400px' }}>

          {/* App sidebar */}
          <div className="w-40 bg-zinc-950 border-r border-white/[0.05] flex flex-col py-3 px-2 shrink-0">
            <div className="flex items-center gap-2 px-2 mb-4">
              <div className="w-5 h-5 bg-white flex items-center justify-center">
                <span className="text-black text-[9px] font-black">Y</span>
              </div>
              <span className="text-[11px] font-semibold">Yugati</span>
            </div>
            {(['Mail', 'Calendar', 'AI Chat'] as const).map((label) => (
              <div key={label}
                className={`flex items-center gap-2 px-2 py-1.5 mb-0.5 select-none
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
              <div className="flex items-center bg-zinc-950 border border-white/[0.06] p-0.5 gap-0.5">
                {(['manual', 'chat'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-medium transition-colors duration-100
                      ${mode === m ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {m === 'manual'
                      ? <><div className="w-1.5 h-1.5 bg-zinc-400" />Manual{mode === 'manual' && <span className="w-1.5 h-1.5 rounded-full bg-white/50" />}</>
                      : <>AI Chat{mode === 'chat' && <span className="w-1.5 h-1.5 rounded-full bg-white/50" />}</>
                    }
                  </button>
                ))}
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
                    <div className={`max-w-[80%] px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line
                      ${msg.role === 'user'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-zinc-950 border border-white/[0.06] text-zinc-400'
                      }`}
                    >
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
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:  Bot,
    label: 'AI chat built in',
    desc:  'Ask anything about your inbox — summarise threads, draft replies, find that email from 6 months ago — in plain language.',
  },
  {
    icon:  Zap,
    label: 'Instant triage',
    desc:  'Primary, Promotions, Social, Updates — auto-sorted on arrival. Toggle between Manual and AI Chat with a single click.',
  },
  {
    icon:  Calendar,
    label: 'Calendar, right there',
    desc:  'Your schedule lives in the same view as your inbox. See conflicts, create events, open Google Calendar in one click.',
  },
] as const;

function FeaturesSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-28 w-full">
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

// ─── Bottom CTA ────────────────────────────────────────────────────────────────

function CTASection({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-28 w-full">
      <div className={`relative border border-white/[0.07] bg-zinc-950 overflow-hidden p-16 text-center ${edgeShadow}`}>

        {/* Moving grid inside the card */}
        <div
          className="pointer-events-none absolute inset-0 animate-grid-move"
          style={{
            backgroundImage:
              'linear-gradient(to right,rgba(255,255,255,0.048) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.048) 1px,transparent 1px)',
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
            className={`group relative inline-flex items-center gap-3 px-7 py-3.5 bg-white text-black font-semibold text-sm border border-white/20
              hover:-translate-y-px hover:shadow-[0_0_40px_rgba(255,255,255,0.22)]
              active:translate-y-0 active:shadow-none
              transition-all duration-150 overflow-hidden ${edgeShadow}`}
          >
            <span className="pointer-events-none absolute inset-0
              bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.5)_50%,transparent_65%)]
              opacity-0 group-hover:opacity-100
              [background-size:200%_100%] [background-position:-100%_0]
              group-hover:[background-position:200%_0]
              [transition:opacity_0.15s,background-position_0.5s]" />
            <GoogleIcon />
            Continue with Google
            <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>

        </div>
      </div>
    </section>
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

        <div className="flex items-center gap-1.5 text-xs text-zinc-700">
          <Shield size={11} />
          End-to-end encrypted
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
