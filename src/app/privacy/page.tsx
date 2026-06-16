import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Yugati',
  description: 'How Yugati collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.06] sticky top-0 bg-black/80 backdrop-blur-xl z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-white flex items-center justify-center">
              <span className="text-black text-[9px] font-black">Y</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Yugati</span>
          </Link>
          <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last updated: June 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-zinc-300 leading-relaxed">

          <Section title="1. Introduction">
            <p>
              Yugati (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is an AI productivity platform operated by Saurav Jha,
              based in India. This Privacy Policy explains how we collect, use, store, and protect
              your personal information when you use our service at{' '}
              <a href="https://www.yugati.in" className="text-white hover:text-zinc-300">
                www.yugati.in
              </a>.
            </p>
            <p>
              By using Yugati, you agree to the practices described in this policy.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong className="text-white">Account information:</strong> Your name, email address,
                and profile picture provided when you sign in with Google.
              </li>
              <li>
                <strong className="text-white">Gmail data:</strong> Email metadata (sender, subject,
                date, snippet), message content when you explicitly request the AI to read or act on
                emails. We do not read your emails without your instruction.
              </li>
              <li>
                <strong className="text-white">Google Calendar data:</strong> Event titles, dates,
                times, and attendees when you use calendar features.
              </li>
              <li>
                <strong className="text-white">Chat history:</strong> Conversations with the AI
                assistant, stored to provide continuity across sessions.
              </li>
              <li>
                <strong className="text-white">Usage data:</strong> Number of AI messages sent,
                voice transcriptions used, and plan tier, for billing and rate limiting.
              </li>
              <li>
                <strong className="text-white">Payment information:</strong> Razorpay order IDs and
                payment verification tokens. We do not store card numbers or bank details — these
                are handled entirely by Razorpay.
              </li>
              <li>
                <strong className="text-white">Technical data:</strong> IP address, browser type,
                and session tokens for security and authentication.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Provide and operate the Yugati service</li>
              <li>Process AI assistant requests using your Gmail and Calendar data</li>
              <li>Authenticate you via Google OAuth</li>
              <li>Enforce usage quotas and rate limits per your subscription plan</li>
              <li>Process payments and manage subscriptions via Razorpay</li>
              <li>Cache Gmail messages and Calendar events to reduce API calls and improve performance</li>
              <li>Improve the reliability and performance of the platform</li>
              <li>Respond to support requests</li>
            </ul>
            <p>
              We do not sell your personal information to third parties. We do not use your Gmail
              or Calendar content to train AI models.
            </p>
          </Section>

          <Section title="4. AI Processing and OpenAI">
            <p>
              Yugati uses OpenAI&apos;s API (GPT-4.1-mini and GPT-4o-mini models, and Whisper for voice
              transcription) to process your requests. When you send a message to the AI assistant,
              relevant context from your emails or calendar may be included in the request to OpenAI.
            </p>
            <p>
              OpenAI processes this data according to their own{' '}
              <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white hover:text-zinc-300">
                Privacy Policy
              </a>. By using Yugati&apos;s AI features, you consent to this processing.
            </p>
          </Section>

          <Section title="5. Google API Services">
            <p>
              Yugati&apos;s use and transfer of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-white hover:text-zinc-300">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </p>
            <ul>
              <li>We only access Gmail and Calendar data to provide in-app features you explicitly request</li>
              <li>We do not transfer your Google data to third parties except as necessary to operate the service (OpenAI for AI features, Supabase for storage)</li>
              <li>We do not use Google data for advertising</li>
              <li>We do not allow humans to read your Google data unless you have given explicit permission for support purposes</li>
            </ul>
          </Section>

          <Section title="6. Data Storage and Security">
            <p>
              Your data is stored in a PostgreSQL database hosted by Supabase, with servers in the
              European Union. OAuth credentials for Gmail and Google Calendar are encrypted at rest
              using envelope encryption (AES-256) via our Corsair integration layer.
            </p>
            <p>
              Session data is stored in HTTP-only cookies with secure flags in production. We use
              Upstash Redis for rate limiting — only request counts are stored, not message content.
            </p>
            <p>
              We implement industry-standard security measures, but no system is perfectly secure.
              Please notify us at{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300">
                jhasaurav020900@gmail.com
              </a>{' '}
              if you discover a security vulnerability.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>
              We retain your account data for as long as your account is active. Cached email and
              calendar data has a 3-minute freshness window and is refreshed on subsequent visits.
              Chat history is retained to provide session continuity and can be cleared by you at
              any time within the app.
            </p>
            <p>
              Payment records (order IDs, amounts, plan history) are retained for 7 years as
              required by Indian tax regulations.
            </p>
            <p>
              You may request deletion of your account and associated data by contacting us at{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300">
                jhasaurav020900@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="8. Third-Party Services">
            <p>Yugati uses the following third-party services, each with their own privacy policies:</p>
            <ul>
              <li><strong className="text-white">Google OAuth:</strong> Authentication and Gmail/Calendar access</li>
              <li><strong className="text-white">OpenAI:</strong> AI language model and voice transcription processing</li>
              <li><strong className="text-white">Supabase:</strong> Database hosting and storage</li>
              <li><strong className="text-white">Razorpay:</strong> Payment processing (India)</li>
              <li><strong className="text-white">Upstash:</strong> Redis for rate limiting</li>
              <li><strong className="text-white">Vercel:</strong> Application hosting and edge network</li>
              <li><strong className="text-white">Corsair:</strong> OAuth credential management and API integration layer</li>
            </ul>
          </Section>

          <Section title="9. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Revoke Google OAuth access at any time via your Google Account settings</li>
              <li>Export your chat history</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300">
                jhasaurav020900@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="10. Children&apos;s Privacy">
            <p>
              Yugati is not directed at children under 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with their data,
              please contact us for immediate removal.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email or a notice in the app. Continued use of Yugati after changes
              constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For any privacy-related questions or concerns, contact:<br />
              <strong className="text-white">Saurav Jha</strong><br />
              Email:{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300">
                jhasaurav020900@gmail.com
              </a><br />
              Website:{' '}
              <a href="https://www.yugati.in" className="text-white hover:text-zinc-300">
                www.yugati.in
              </a>
            </p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-6 mt-8">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-700">
          <span>© 2026 Yugati</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </section>
  );
}
