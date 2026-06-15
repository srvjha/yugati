import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Yugati',
  description: 'Terms and conditions for using Yugati.',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight mb-3">Terms of Service</h1>
          <p className="text-zinc-500 text-sm">Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-zinc-400 text-sm leading-relaxed">

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Yugati at{' '}
              <a href="https://www.yugati.in" className="text-white hover:text-zinc-300 underline underline-offset-2">
                www.yugati.in
              </a>{' '}
              ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you
              do not agree to these Terms, do not use the Service.
            </p>
            <p>
              Yugati is operated by Saurav Jha ("we", "us", or "our"), an individual operating
              from India.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Yugati is an AI-powered productivity platform that connects to your Gmail and Google
              Calendar accounts to help you manage email and calendar tasks through natural language.
              The Service includes:
            </p>
            <ul>
              <li>An AI chat interface (agentic mode) that can read, draft, and send emails on your behalf</li>
              <li>A manual email management interface for browsing, composing, and organizing Gmail</li>
              <li>Google Calendar integration for viewing and managing events</li>
              <li>Voice input for AI interactions via OpenAI Whisper</li>
            </ul>
          </Section>

          <Section title="3. Account Registration">
            <p>
              To use the Service, you must sign in using a valid Google account. You are
              responsible for maintaining the security of your Google account. You must be at
              least 13 years old to use Yugati.
            </p>
            <p>
              By connecting your Google account, you authorize Yugati to access your Gmail and
              Google Calendar data as described in our{' '}
              <Link href="/privacy" className="text-white hover:text-zinc-300 underline underline-offset-2">
                Privacy Policy
              </Link>. You may revoke this access at any time via your Google Account settings.
            </p>
          </Section>

          <Section title="4. Subscription Plans and Billing">
            <p>
              Yugati offers the following plans:
            </p>
            <ul>
              <li><strong className="text-white">Free:</strong> 30 AI messages, 1 voice transcription, 10 email composes per month — no payment required</li>
              <li><strong className="text-white">Standard:</strong> INR 199/month — 150 AI messages, 15 voice transcriptions, 50 composes</li>
              <li><strong className="text-white">Premium:</strong> INR 499/month — 500 AI messages, 30 voice transcriptions, 150 composes</li>
              <li><strong className="text-white">Enterprise:</strong> Custom pricing — unlimited usage</li>
            </ul>
            <p>
              All payments are processed in Indian Rupees (INR) via Razorpay. Prices are
              inclusive of applicable taxes. Plans are billed monthly and activate immediately
              upon successful payment.
            </p>
          </Section>

          <Section title="5. Refund Policy">
            <p>
              Due to the digital nature of the service and immediate activation of plan benefits,
              we generally do not offer refunds. However, if you experience a technical failure
              that prevents you from using a paid plan, contact us within 7 days at{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300 underline underline-offset-2">
                jhasaurav020900@gmail.com
              </a>{' '}
              and we will review your case.
            </p>
            <p>
              In cases of accidental duplicate charges, we will issue a full refund for the
              duplicate transaction.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Send spam, phishing emails, or unsolicited bulk messages through the AI email features</li>
              <li>Violate any applicable laws or regulations, including India&apos;s IT Act 2000</li>
              <li>Attempt to circumvent usage limits, rate limits, or authentication mechanisms</li>
              <li>Reverse engineer, decompile, or otherwise attempt to extract the source code</li>
              <li>Use automated scripts to access the Service in a manner that exceeds reasonable use</li>
              <li>Share your account credentials with other users</li>
              <li>Use the AI features to generate harmful, threatening, or illegal content</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms
              without prior notice.
            </p>
          </Section>

          <Section title="7. AI-Generated Actions">
            <p>
              The AI assistant can take actions on your behalf, including sending emails and
              modifying calendar events. You are solely responsible for reviewing and approving
              AI-suggested actions before they are executed.
            </p>
            <p>
              The AI assistant is designed to confirm before sending emails, but you should
              always verify AI-generated content before authorizing it. We are not liable for
              emails sent or actions taken at your explicit instruction.
            </p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              The Yugati platform, including its design, code, and branding, is owned by
              Saurav Jha. You retain ownership of all data you bring into the Service,
              including your emails and calendar events.
            </p>
            <p>
              You grant Yugati a limited, non-exclusive license to access and process your
              Gmail and Calendar data solely for the purpose of providing the Service to you.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by Indian law, Yugati and its operator shall not
              be liable for:
            </p>
            <ul>
              <li>Any indirect, incidental, or consequential damages arising from use of the Service</li>
              <li>Loss of data, including emails accidentally deleted through AI-assisted actions</li>
              <li>Unauthorized access to your account resulting from your failure to secure your Google credentials</li>
              <li>Interruptions to the Service due to maintenance, third-party outages (Google, OpenAI, Razorpay), or events beyond our control</li>
            </ul>
            <p>
              Our total liability to you for any claim arising from these Terms shall not
              exceed the amount you paid to Yugati in the three months preceding the claim.
            </p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>
              The Service is provided "as is" without warranties of any kind, express or
              implied. We do not warrant that the Service will be uninterrupted, error-free,
              or that AI-generated responses will be accurate or appropriate for your needs.
            </p>
            <p>
              AI language models can make mistakes. Always verify important information before
              acting on AI-generated responses, especially for time-sensitive or financial matters.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              You may cancel your account at any time by contacting us. We reserve the right
              to suspend or terminate accounts for violations of these Terms, non-payment, or
              at our sole discretion with 7 days&apos; notice.
            </p>
            <p>
              Upon termination, your data will be retained for 30 days before deletion, except
              payment records which are retained as required by law.
            </p>
          </Section>

          <Section title="12. Governing Law and Disputes">
            <p>
              These Terms are governed by the laws of India. Any disputes arising from these
              Terms or your use of the Service shall be subject to the exclusive jurisdiction
              of the courts of India.
            </p>
            <p>
              Before pursuing legal action, you agree to attempt to resolve disputes informally
              by contacting us at{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300 underline underline-offset-2">
                jhasaurav020900@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. Material changes will
              be communicated with at least 14 days&apos; notice via email or in-app notification.
              Continued use after changes constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              For questions about these Terms:<br />
              <strong className="text-white">Saurav Jha</strong><br />
              Email:{' '}
              <a href="mailto:jhasaurav020900@gmail.com" className="text-white hover:text-zinc-300 underline underline-offset-2">
                jhasaurav020900@gmail.com
              </a><br />
              Website:{' '}
              <a href="https://www.yugati.in" className="text-white hover:text-zinc-300 underline underline-offset-2">
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
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
