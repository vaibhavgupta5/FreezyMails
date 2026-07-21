import { MarketingHeader } from "@/app/_components/MarketingHeader";
import { MarketingFooter } from "@/app/_components/MarketingFooter";
import { ScrollReveal } from "@/app/_components/ScrollReveal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | FreezyMails",
  description: "Terms of Service for FreezyMails",
};

export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg-subtle text-text-primary font-sans selection:bg-primary-base selection:text-primary-text relative overflow-hidden px-2">
      <div
        className="fixed inset-0 z-[100] pointer-events-none opacity-[0.02] transform-gpu"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      <MarketingHeader />

      <main className="flex-1 relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-32 md:py-40">
        <ScrollReveal>
          <h1 className="text-4xl md:text-5xl font-black mb-8 font-outfit">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none text-text-muted space-y-6">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">1. Acceptance of Terms</h2>
              <p>
                By accessing and using FreezyMails, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">2. Acceptable Use</h2>
              <p>
                You agree not to use the service to send spam, unsolicited commercial email, or any content that is illegal, abusive, or malicious. You are solely responsible for the content of the emails you send and for complying with anti-spam laws in your jurisdiction (such as CAN-SPAM, GDPR, etc.).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">3. Account Responsibilities</h2>
              <p>
                You are responsible for safeguarding the password and API credentials that you use to access the service and for any activities or actions under your password. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">4. Limitation of Liability</h2>
              <p>
                In no event shall FreezyMails, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">5. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at: <a href="mailto:vaibhavgupta.v890@gmail.com" className="text-primary-base hover:underline">vaibhavgupta.v890@gmail.com</a>.
              </p>
            </section>
          </div>
        </ScrollReveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
