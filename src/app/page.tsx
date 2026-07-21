import Link from "next/link";
import { Mail, Bot, BarChart2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getUser } from "@/lib/supabase";
import dynamic from "next/dynamic";

const DashboardPreview = dynamic(
 () => import("./_components/DashboardPreview"),
);
const SplashScreen = dynamic(() => import("./_components/SplashScreen"));

export default async function LandingPage() {
 const user = await getUser();

 return (
 <>
 <SplashScreen />
 <div className="min-h-[100dvh] bg-bg-subtle text-text-primary font-sans selection:bg-primary-base selection:text-primary-text relative overflow-hidden">
 {/* Frozen Grid Background */}
 <div
 className="absolute inset-0 z-0 pointer-events-none"
 style={{
 backgroundImage: `
 linear-gradient(rgba(120,160,255,.05) 1px, transparent 1px),
 linear-gradient(90deg, rgba(120,160,255,.05) 1px, transparent 1px)
 `,
 backgroundSize: "48px 48px",
 maskImage:
 "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
 WebkitMaskImage:
 "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
 }}
 />

 {/* Decorative Orbs */}
 <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-primary-base rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse pointer-events-none z-0"></div>
 <div
 className="absolute top-[10%] right-[-10%] w-[40rem] h-[40rem] bg-primary-base rounded-full mix-blend-multiply filter blur-[120px] opacity-10 animate-pulse pointer-events-none z-0"
 style={{ animationDelay: "2s" }}
 ></div>

 {/* Navbar */}
 <nav className="relative z-20 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
 <Logo textColor="text-text-primary drop- -sm" />
 <div className="flex gap-4">
 {user ? (
 <Link href="/dashboard" className="skeu-btn-primary font-medium">
 Go to Dashboard
 </Link>
 ) : (
 <>
 <Link href="/login" className="skeu-btn-ghost font-medium">
 Log in
 </Link>
 <Link href="/login" className="skeu-btn-primary font-medium">
 Get Started
 </Link>
 </>
 )}
 </div>
 </nav>

 {/* Hero Section */}
 <main className="relative z-10 max-w-7xl mx-auto px-8 py-20 lg:py-24 flex flex-col items-center text-center">
 <div className="relative w-full flex justify-center">
 {/* Subtle SVG Ice Crack Background */}
 <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-5 text-text-primary">
 <svg
 width="100%"
 height="100%"
 viewBox="0 0 800 300"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 preserveAspectRatio="xMidYMid slice"
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150"
 >
 <path
 d="M400,150 L420,120 L450,130 L480,90 L520,110 L580,60"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M400,150 L380,180 L350,170 L320,210 L280,190 L220,240"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M420,120 L410,80 L430,50"
 stroke="currentColor"
 strokeWidth="1.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M450,130 L470,160 L510,150 L540,190"
 stroke="currentColor"
 strokeWidth="1.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M380,180 L390,220 L370,250"
 stroke="currentColor"
 strokeWidth="1.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M350,170 L330,140 L290,150 L260,110"
 stroke="currentColor"
 strokeWidth="1.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M480,90 L490,50 L470,20"
 stroke="currentColor"
 strokeWidth="1"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <path
 d="M320,210 L310,250 L330,280"
 stroke="currentColor"
 strokeWidth="1"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 </svg>
 </div>

 <h1 className="relative z-10 text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-5xl text-text-primary leading-[1.05] drop- -sm">
 Cold outreach that actually{" "}
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-ice-500 via-ice-600 to-ice-900 pb-2 pr-2">
 breaks the ice.
 </span>
 </h1>
 </div>

 <p className="text-xl md:text-2xl text-text-muted/90 mb-12 max-w-2xl leading-relaxed font-medium">
 Send personalized cold emails, manage multiple inboxes, and let AI
 handle your replies. The all-in-one platform for modern sales teams.
 </p>

 <div className="flex flex-col sm:flex-row gap-4">
 {user ? (
 <Link
 href="/dashboard"
 className="skeu-btn-primary text-lg px-8 py-4 -lg -ice-500/20"
 >
 Go to your Dashboard
 </Link>
 ) : (
 <Link
 href="/login"
 className="skeu-btn-primary text-lg px-8 py-4 -lg -ice-500/20"
 >
 Start Sending Free
 </Link>
 )}
 <Link
 href="#features"
 className="skeu-btn-ghost text-lg px-8 py-4 bg-bg-base"
 >
 See how it works
 </Link>
 </div>

 {/* Dashboard Preview / Graphic Placeholder */}
 <div className="mt-24 w-full max-w-6xl skeu-card p-2 md:p-4 bg-bg-base rounded-2xl transform md:rotate-1 hover:rotate-0 transition-transform duration-500 -[0_20px_50px_-12px_rgba(0,0,0,0.1)] hover: -[0_20px_50px_-12px_rgba(34,136,204,0.2)]">
 <div className="bg-bg-base rounded-xl border border-border-subtle -skeu-inset aspect-[16/9] flex flex-col overflow-hidden relative">
 <div className="h-10 border-b border-border-subtle bg-bg-subtle flex items-center px-4 gap-2 shrink-0">
 <div className="w-3 h-3 rounded-full bg-red-400 -sm border border-red-500"></div>
 <div className="w-3 h-3 rounded-full bg-amber-400 -sm border border-amber-500"></div>
 <div className="w-3 h-3 rounded-full bg-green-400 -sm border border-green-500"></div>
 </div>
 <DashboardPreview />
 </div>
 </div>
 </main>

 {/* Features Section */}
 <section
 id="features"
 className="bg-bg-base border-y border-border-subtle py-24 -skeu-inset"
 >
 <div className="max-w-7xl mx-auto px-8">
 <div className="text-center mb-16">
 <h2 className="text-3xl lg:text-4xl font-bold mb-4 drop- -sm">
 Everything you need to close more deals
 </h2>
 <p className="text-lg text-text-muted max-w-2xl mx-auto">
 No complex setups. Just connect your inboxes and start reaching
 out to prospects in minutes.
 </p>
 </div>

 <div className="grid md:grid-cols-3 gap-8">
 <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
 <div className="w-12 h-12 rounded-lg bg-border-subtle text-primary-base flex items-center justify-center mb-6 -skeu-inset border border-border-subtle">
 <Mail size={24} />
 </div>
 <h3 className="text-xl font-bold mb-2">Unlimited Inboxes</h3>
 <p className="text-text-muted leading-relaxed">
 {
 "Connect as many email accounts as you need. We'll automatically"
 }
 route your replies and track health scores.
 </p>
 </div>

 <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
 <div className="w-12 h-12 rounded-lg bg-warning-bg text-warning-text flex items-center justify-center mb-6 -skeu-inset border border-transparent">
 <Bot size={24} />
 </div>
 <h3 className="text-xl font-bold mb-2">AI-Powered Replies</h3>
 <p className="text-text-muted leading-relaxed">
 Let Gemini analyze incoming replies and draft the perfect
 response. You just click send.
 </p>
 </div>

 <div className="skeu-card flex flex-col items-start p-8 hover:-translate-y-1 transition-transform">
 <div className="w-12 h-12 rounded-lg bg-success-bg text-success-text flex items-center justify-center mb-6 -skeu-inset border border-transparent">
 <BarChart2 size={24} />
 </div>
 <h3 className="text-xl font-bold mb-2">Deep Analytics</h3>
 <p className="text-text-muted leading-relaxed">
 Track opens, clicks, and replies across all your campaigns.
 A/B test your templates to find winners.
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* CTA Section */}
 <section className="py-24 max-w-4xl mx-auto text-center px-8">
 <h2 className="text-4xl font-bold mb-6 drop- -sm">
 {user
 ? "Ready to send more emails?"
 : "Ready to scale your outreach?"}
 </h2>
 <p className="text-xl text-text-muted mb-8">
 Join thousands of sales professionals using FreezyMails today.
 </p>
 {user ? (
 <Link
 href="/dashboard"
 className="skeu-btn-primary text-lg px-10 py-4 -xl inline-flex items-center gap-2"
 >
 Go to your Dashboard <Mail size={20} />
 </Link>
 ) : (
 <Link
 href="/login"
 className="skeu-btn-primary text-lg px-10 py-4 -xl inline-flex items-center gap-2"
 >
 Create Your Free Account <Mail size={20} />
 </Link>
 )}
 </section>

 {/* Footer */}
 <footer className="border-t border-border-subtle py-12 text-center text-text-muted">
 <div className="flex justify-center mb-4 opacity-60">
 <Logo
 iconSize={24}
 textSize="text-xl"
 textColor="text-text-primary"
 />
 </div>
 <p className="text-sm flex items-center justify-center gap-1">
 Â© {new Date().getFullYear()} FreezyMails.{" "}
 <br className="md:hidden" />
 <span className="hidden md:inline">•</span>
 Made by{" "}
 <a
 href="https://github.com/vaibhavgupta5"
 target="_blank"
 rel="noopener noreferrer"
 className="font-medium hover:text-primary-base transition-colors underline decoration-ice-300 decoration-2 underline-offset-2"
 >
 vaibhavgupta5
 </a>
 </p>
 </footer>
 </div>
 </>
 );
}
