import { MarketingHeader } from "@/app/_components/MarketingHeader";
import { MarketingFooter } from "@/app/_components/MarketingFooter";
import { ScrollReveal } from "@/app/_components/ScrollReveal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | FreezyMails",
  description: "Privacy Policy for FreezyMails",
};

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl md:text-5xl font-black mb-8 font-outfit">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none text-text-muted space-y-6">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us when you create an account, connect email accounts, and use the FreezyMails platform for your outreach campaigns. This includes your email address, connected account credentials (stored securely), and campaign data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services. Specifically, we use your connected email accounts to send outreach emails on your behalf as configured in your campaigns. We also use your data to provide analytics and monitor the health of your campaigns.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">3. Data Security</h2>
              <p>
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. Passwords and API tokens are encrypted.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-text-primary">4. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:vaibhavgupta.v890@gmail.com" className="text-primary-base hover:underline">vaibhavgupta.v890@gmail.com</a>.
              </p>
            </section>
          </div>
        </ScrollReveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
