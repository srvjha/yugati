'use client';

import { signIn } from '@/lib/auth-client';
import { Mail, Calendar, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-zinc-800 sticky top-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <span className="text-black text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-sm">SuperAI</span>
          </div>
          <button
            onClick={() => signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">

          {/* Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
            <Sparkles size={12} className="text-zinc-500" />
            AI-powered email and calendar automation
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Email at the speed
            <br />
            <span className="text-zinc-500">of thought</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
            SuperAI connects to your Gmail and Google Calendar to automate the
            tedious parts — so you can focus on what matters.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <button
              onClick={() => signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
              className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-zinc-100 transition-colors"
            >
              <GoogleIcon />
              Get started with Google
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-sm hover:border-zinc-600 hover:text-white transition-colors">
              See how it works
              <ArrowRight size={14} />
            </button>
          </div>

          <p className="text-xs text-zinc-600 mt-1">
            Free to start · No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Mail size={18} className="text-zinc-400" />}
            title="Smart inbox"
            description="Automatically triage, label, and prioritise incoming emails using AI. Zero inbox, all the time."
          />
          <FeatureCard
            icon={<Calendar size={18} className="text-zinc-400" />}
            title="Calendar automation"
            description="Schedule meetings, find availability, and create events — just by describing what you need."
          />
          <FeatureCard
            icon={<Zap size={18} className="text-zinc-400" />}
            title="Instant actions"
            description="Reply, forward, archive, and snooze with keyboard shortcuts and AI-drafted responses."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-zinc-600">© 2026 SuperAI</span>
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <Shield size={12} />
            End-to-end encrypted
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
