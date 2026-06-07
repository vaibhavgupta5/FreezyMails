import Link from "next/link";
import { Snowflake, Mail, BarChart2, Bot } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-200 text-surface-900 font-sans selection:bg-ice-300 selection:text-ice-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Snowflake className="text-ice-500" size={32} />
          <span className="text-2xl font-bold text-surface-900 drop-shadow-sm">
            FreezyMails
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="skeu-btn-ghost font-medium">
            Log in
          </Link>
          <Link href="/login" className="skeu-btn-primary font-medium">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-20 lg:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ice-50 border border-ice-200 text-ice-800 text-sm font-medium mb-8 shadow-sm">
          <Snowflake size={16} /> Now with AI-powered replies
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-surface-900 drop-shadow-sm">
          Cold outreach that actually{" "}
          <span className="text-ice-600 drop-shadow-sm">breaks the ice</span>.
        </h1>

        <p className="text-xl text-surface-600 mb-10 max-w-2xl leading-relaxed">
          Send personalized cold emails, manage multiple inboxes, and let AI
          handle your replies. The all-in-one platform for modern sales teams.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="skeu-btn-primary text-lg px-8 py-4 shadow-lg shadow-ice-500/20"
          >
            Start Sending Free
          </Link>
          <Link
            href="#features"
            className="skeu-btn-ghost text-lg px-8 py-4 bg-surface-100"
          >
            See how it works
          </Link>
        </div>

        {/* Dashboard Preview / Graphic Placeholder */}
        <div className="mt-24 w-full max-w-5xl skeu-card p-2 md:p-4 bg-surface-100 rounded-2xl transform md:rotate-1 hover:rotate-0 transition-transform duration-500">
          <div className="bg-surface-50 rounded-xl border border-surface-300 shadow-skeu-inset aspect-[16/9] flex flex-col overflow-hidden relative">
            <div className="h-10 border-b border-surface-300 bg-surface-200 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm border border-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm border border-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm border border-green-500"></div>
            </div>
            <div className="flex-1 p-8 flex items-center justify-center text-surface-400 flex-col gap-4">
              <BarChart2 size={64} className="opacity-50 text-surface-500" />
              <p className="font-medium text-lg text-surface-500">
                Interactive Dashboard Preview
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section
        id="features"
        className="bg-surface-100 border-y border-surface-300 py-24 shadow-skeu-inset"
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 drop-shadow-sm">
              Everything you need to close more deals
            </h2>
            <p className="text-lg text-surface-600 max-w-2xl mx-auto">
              No complex setups. Just connect your inboxes and start reaching
              out to prospects in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-lg bg-ice-100 text-ice-600 flex items-center justify-center mb-6 shadow-skeu-inset border border-ice-200">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Unlimited Inboxes</h3>
              <p className="text-surface-600 leading-relaxed">
                Connect as many email accounts as you need. We'll automatically
                route your replies and track health scores.
              </p>
            </div>

            <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-6 shadow-skeu-inset border border-amber-200">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">AI-Powered Replies</h3>
              <p className="text-surface-600 leading-relaxed">
                Let Gemini analyze incoming replies and draft the perfect
                response. You just click send.
              </p>
            </div>

            <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-skeu-inset border border-emerald-200">
                <BarChart2 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Deep Analytics</h3>
              <p className="text-surface-600 leading-relaxed">
                Track opens, clicks, and replies across all your campaigns. A/B
                test your templates to find winners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 max-w-4xl mx-auto text-center px-8">
        <h2 className="text-4xl font-bold mb-6 drop-shadow-sm">
          Ready to scale your outreach?
        </h2>
        <p className="text-xl text-surface-600 mb-8">
          Join thousands of sales professionals using FreezyMails today.
        </p>
        <Link
          href="/login"
          className="skeu-btn-primary text-lg px-10 py-4 shadow-xl inline-flex items-center gap-2"
        >
          Create Your Free Account <Mail size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-400 py-12 text-center text-surface-600">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-60">
          <Snowflake size={24} />
          <span className="text-xl font-bold">FreezyMails</span>
        </div>
        <p className="text-sm">
          Â© {new Date().getFullYear()} FreezyMails. Built with Next.js &
          Tailwind CSS.
        </p>
      </footer>
    </div>
  );
}
