import Link from "next/link";
import {
  Mail,
  ArrowRight,
  Users,
  Inbox,
  GitMerge,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { ScrollReveal } from "./_components/ScrollReveal";
import { InteractiveToggle } from "./_components/InteractiveToggle";
import { Spotlight } from "@/components/ui/Spotlight";
import { MobileNav } from "./_components/MobileNav";

const DashboardPreview = dynamic(() => import("./_components/DashboardPreview"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[400px] w-full" />
});
const InteractiveExtractor = dynamic(() => import("./_components/InteractiveExtractor"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[250px] w-full" />
});
const TerminalScraper = dynamic(() => import("./_components/TerminalScraper"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[300px] w-full" />
});
const ABTestingVisual = dynamic(() => import("./_components/ABTestingVisual"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[350px] w-full" />
});
const AISequenceVisual = dynamic(() => import("./_components/AISequenceVisual"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[300px] w-full" />
});
const InboxVisual = dynamic(() => import("./_components/InboxVisual"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[400px] w-full" />
});
const AudienceVisual = dynamic(() => import("./_components/AudienceVisual"), {
  loading: () => <div className="animate-pulse bg-bg-subtle rounded-xl h-[400px] w-full" />
});

export default async function LandingPage() {
  const user = await getUser();

  return (
    <>
      <div className="min-h-[100dvh] bg-bg-subtle text-text-primary font-sans selection:bg-primary-base selection:text-primary-text relative overflow-hidden px-2">
        {/* --- Global Noise Overlay --- */}
        <div
          className="fixed inset-0 z-[100] pointer-events-none opacity-[0.02] transform-gpu"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        ></div>

        {/* --- 4.0 Header / Navigation --- */}
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <nav className="pointer-events-auto bg-bg-base/80 backdrop-blur-xl border border-border-subtle shadow-lg shadow-black/5 rounded-lg px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-6 sm:gap-12 transition-all duration-300 w-full max-w-7xl mx-auto">
            <Logo textColor="text-text-primary drop-shadow-sm" />
            <div className="flex items-center">
              <div className="hidden sm:flex items-center gap-6">
                <Link
                  href="#features"
                  className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all"
                >
                  Features
                </Link>
                <Link
                  href="#use-cases"
                  className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all"
                >
                  Use Cases
                </Link>
                <a
                  href="https://github.com/vaibhavgupta5/FreezyMails"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all hidden md:block"
                >
                  GitHub
                </a>
                <Link
                  href="/login"
                  className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all mr-2"
                >
                  Log in
                </Link>
              </div>
              <Link
                href={user ? "/dashboard" : "/login"}
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "hidden sm:inline-flex sm:text-sm text-xs px-3 py-1.5 sm:px-4 sm:py-2 font-bold shadow-sm sm:ml-4",
                )}
              >
                {user ? "Dashboard" : "Start Free"}
              </Link>
              <MobileNav hasUser={!!user} />
            </div>
          </nav>
        </div>

        {/* --- 4.1 Hero --- */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-32 md:py-20 lg:py-24 flex flex-col md:flex-row items-center gap-14 min-h-[85vh]">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="var(--primary-base)" />
          
          {/* Left Column (Copy) */}
          <div className="w-full md:w-[50%] flex flex-col justify-center items-start">
            <ScrollReveal>
              <span className="text-xs uppercase tracking-widest font-bold text-text-muted mb-4 block font-mono">
                Your smarter, anti-spam Gmail
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 text-text-primary drop-shadow-sm font-outfit">
                {"Land in the founder's inbox."} <br></br>
                <span className="inline-block mt-3 py-2 bg-text-primary text-bg-base text-3xl sm:text-4xl lg:text-5xl">
                  {" "}
                  Not their spam folder.
                </span>
              </h1>
              <p className="text-lg md:text-lg text-text-muted/90 mb-10 max-w-xl leading-relaxed font-medium">
                FreezyMails is the ultimate cold email engine for job seekers.
                Automatically scrape startup websites for HR and founder emails,
                A/B test your pitch, and safely drip your sends across multiple
                accounts to guarantee deliverability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center w-full sm:w-auto">
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "lg" }),
                    "w-full sm:w-auto text-base sm:text-lg px-6 py-5 sm:px-8 sm:py-6 shadow-sm shadow-ice-500/20",
                  )}
                >
                  {user ? "Go to your Dashboard" : "Start Sending Free"}
                </Link>
                <a
                  href="https://github.com/vaibhavgupta5/FreezyMails"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full sm:w-auto text-base sm:text-lg font-medium text-text-muted hover:text-primary-base group",
                  )}
                >
                  View on GitHub{" "}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column (Visual) */}
          <div className="w-full md:w-[50%] h-[400px] md:h-[85vh] relative flex items-center">
            <ScrollReveal
              delay={0.2}
              className="w-full h-full relative flex items-center"
            >
              <div className="absolute inset-0 bg-primary-base/10 blur-[100px] rounded-full"></div>
              <div className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 w-[110%] md:w-[1000px] h-[100%] md:h-[95%] bg-bg-base rounded-l-2xl border border-r-0 border-border-subtle shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col z-10">
                <div className="h-12 border-b border-border-subtle bg-bg-subtle flex items-center px-6 gap-3 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-border-subtle"></div>
                  <div className="w-3 h-3 rounded-full bg-border-subtle"></div>
                  <div className="w-3 h-3 rounded-full bg-border-subtle"></div>
                  <div className="ml-4 px-3 py-1 bg-bg-base rounded shadow-sm text-xs font-mono text-text-muted flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success-text animate-pulse"></span>
                    Campaign: Senior Dev Outreach
                  </div>
                </div>
                <div className="flex-1 relative bg-bg-subtle overflow-hidden">
                  <DashboardPreview />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </main>

        {/* --- 4.2 Problem Strip --- */}
        <section className="bg-bg-base border-y border-border-subtle shadow-skeu-inset relative z-20">
          <div className="max-w-5xl mx-auto px-8 py-16 text-center">
            <ScrollReveal>
              <p className="text-lg md:text-xl font-medium text-text-muted leading-relaxed">
                Stop blindly applying on job boards and hoping for a reply.
                <br className="hidden md:block" />
                <span className="text-text-primary">
                  FreezyMails gives you the tools
                </span>{" "}
                to find the decision-makers directly and reach them at scale,
                without triggering spam filters.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* --- 4.3 The Flow --- */}
        <section className="py-20 md:py-32 max-w-7xl mx-auto px-4 sm:px-8 relative">
          {/* Dashed vertical line */}
          <div className="absolute left-4 sm:left-8 md:left-1/2 top-0 bottom-0 w-0 border-l border-dashed border-border-subtle -translate-x-1/2 hidden sm:block md:block"></div>

          <ScrollReveal>
            <div className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-outfit drop-shadow-sm">
                From URL list to{" "}
                <u className="underline decoration-white decoration-4 underline-offset-4">
                  booked interview
                </u>
                .
              </h2>
              <p className="text-lg text-text-muted">
                The complete 7-step orchestration workflow.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-20 md:space-y-32">
            {[
              {
                num: "01",
                title: "Connect your accounts",
                text: "Go to Accounts and connect 2-3 email addresses via SMTP/IMAP to spread sending volume across identities.",
                align: "left",
              },
              {
                num: "02",
                title: "Skip the manual hunting",
                text: "In Audience, paste a list of target URLs into the Web Extractor instead of building a CSV by hand. FreezyMails scrapes each site, prioritizes careers@ and founder emails, and enriches every row with company and person name.",
                align: "right",
              },
              {
                num: "03",
                title: "Generate the sequence",
                text: "In Campaigns, open the AI Sequence Generator, enter your ICP and offer, and Gemini drafts a multi-step sequence - initial email plus follow-ups on a delay.",
                align: "left",
              },
              {
                num: "04",
                title: "Test what actually works",
                text: "Add a second body variant and a second subject line to A/B test the opening message before it goes out at scale.",
                align: "right",
              },
              {
                num: "05",
                title: "Choose your pace",
                text: "Select your connected accounts, attach the enriched list, and pick Slow Drip to spread sends randomly across a 4-hour window instead of firing them all at once.",
                align: "left",
              },
              {
                num: "06",
                title: "Let the queue run",
                text: "The pg-boss background worker dispatches the campaign on schedule while you watch open and reply rates in the Dashboard.",
                align: "right",
              },
              {
                num: "07",
                title: "Reply from one inbox",
                text: "As replies come in, open the Inbox, review the full thread in the Email Detail Drawer, and reply directly to move the conversation forward.",
                align: "left",
              },
            ].map((step, idx) => (
              <ScrollReveal key={idx}>
                <div
                  className={`flex flex-col md:flex-row items-center gap-8 md:gap-24 relative z-10 ${step.align === "right" ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="md:w-1/2 flex justify-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-bg-base rounded-full border border-border-subtle flex items-center justify-center absolute left-4 sm:left-8 md:left-1/2 -translate-x-1/2 -mt-4 md:-mt-8 text-xl md:text-2xl font-bold font-mono text-text-primary">
                      {step.num}
                    </div>
                  </div>
                  <div
                    className={`md:w-1/2 flex flex-col ${step.align === "right" ? "md:items-end md:text-right" : "md:items-start md:text-left"} ml-16 md:ml-0`}
                  >
                    <h3 className="text-2xl font-bold mb-4 font-outfit">
                      {step.title}
                    </h3>
                    <p className="text-text-muted leading-relaxed max-w-md">
                      {step.text}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* --- 4.4 Feature Deep-Dives --- */}
        <section
          id="features"
          className="py-16 md:py-24 bg-bg-base border-y border-border-subtle shadow-skeu-inset px-4 sm:px-8"
        >
          <div className="max-w-7xl mx-auto">
            {/* 4.4.1 Website Extraction */}
            <ScrollReveal className="mb-20 md:mb-32">
              <div className="w-full mb-12 flex items-center justify-center">
                <TerminalScraper />
              </div>
              <div className="max-w-3xl mx-auto text-center">
                <h3 className="text-2xl md:text-3xl font-bold mb-4 font-outfit">
                  Bypass the gatekeepers. Go{" "}
                  <u className="underline decoration-white decoration-4 underline-offset-4">
                    straight to the founder
                  </u>
                  .
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Paste a list of company URLs. FreezyMails scrapes each site
                  with Cheerio, checks mailto: links and regex-matched
                  addresses, and extracts HR and founder emails automatically.
                  If the homepage doesn't have a strong contact, it crawls
                  About, Team, Careers, and Contact pages. Company and person
                  names are pulled from metadata - no manual lookup required.
                </p>
              </div>
            </ScrollReveal>

            {/* 4.4.2 Intelligent Drip Scheduling */}
            <ScrollReveal className="mb-20 md:mb-32">
              <div className="flex flex-col md:flex-row gap-16 items-center">
                <div className="w-full md:w-1/2">
                  <InteractiveToggle />
                </div>
                <div className="w-full md:w-1/2">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 font-outfit">
                    <u className="underline decoration-white decoration-4 underline-offset-4">
                      Stay out of spam
                    </u>
                    . Send like a human.
                  </h3>
                  <p className="text-text-muted leading-relaxed mb-6">
                    Fast Drip queues every email to go out immediately. Slow
                    Drip randomizes delivery across a 4-hour window instead, so
                    a campaign looks like a person manually sending emails -
                    keeping you off the radar of spam filters watching for
                    automated bursts.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-warning-bg border border-warning-border text-warning-text rounded-full text-xs font-bold uppercase tracking-wider">
                    Spam Risk Reduction
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 4.4.3 Multivariate A/B Testing Engine */}
            <ScrollReveal className="mb-20 md:mb-32">
              <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
                <div className="w-full md:w-1/2">
                  <ABTestingVisual />
                </div>
                <div className="w-full md:w-1/2">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 font-outfit">
                    A/B test your pitch. Find{" "}
                    <u className="underline decoration-white decoration-4 underline-offset-4">
                      what gets interviews
                    </u>
                    .
                  </h3>
                  <p className="text-text-muted leading-relaxed">
                    Set a split percentage across Subject Lines and Body
                    Variants. FreezyMails deterministically buckets each contact
                    into a variant that matches your target split. Every open
                    and reply is tied to a specific variant - so you can see
                    exactly which pitch converts to interviews, not just guess.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* 4.4.4 AI Sequence Generator */}
            <ScrollReveal className="mb-20 md:mb-32">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 font-outfit">
                    Tell it who you're selling to. It{" "}
                    <u className="underline decoration-white decoration-4 underline-offset-4">
                      writes the sequence
                    </u>
                    .
                  </h3>
                  <p className="text-text-muted leading-relaxed max-w-2xl mx-auto">
                    Enter your Ideal Customer Profile, your offer, and the tone
                    you want. FreezyMails calls Google's Generative AI to map
                    out a complete multi-step sequence - an initial email plus
                    follow-ups on a delay - complete with subject lines and body
                    copy, ready to refine.
                  </p>
                </div>

                <div className="w-full mt-8">
                  <AISequenceVisual />
                </div>
              </div>
            </ScrollReveal>

            {/* 4.4.5 Multi-Account & Unified Inbox & 4.4.6 Audience */}
            <div className="grid md:grid-cols-2 gap-16">
              <ScrollReveal>
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded bg-bg-subtle border border-border-subtle flex items-center justify-center mb-6 shadow-skeu-inset">
                      <Inbox className="text-text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 font-outfit">
                      Send from multiple accounts. Reply from one.
                    </h3>
                    <p className="text-text-muted leading-relaxed mb-8">
                      Connect 2-3 personal domains to safely spread your sending
                      volume and protect your sender reputation. FreezyMails
                      handles the outbound delivery and routes every inbound
                      reply back into a single Unified Inbox - no jumping
                      between mailboxes to schedule your interview.
                    </p>
                  </div>
                  <InboxVisual />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded bg-bg-subtle border border-border-subtle flex items-center justify-center mb-6 shadow-skeu-inset">
                      <Users className="text-text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 font-outfit">
                      Everything else you'd expect from a real contact list
                    </h3>
                    <p className="text-text-muted leading-relaxed mb-8">
                      Bulk CSV import, dynamic custom fields, inline editing,
                      and smart statuses. The parts of list management that
                      shouldn't need their own marketing section, but shouldn't
                      be missing either.
                    </p>
                  </div>
                  <AudienceVisual />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* --- 4.5 Free & Open (Hosted or Self-Hosted) --- */}
        <section className="py-24 max-w-5xl mx-auto px-8 relative z-10">
          <ScrollReveal>
            <h2 className="text-4xl font-bold mb-12 text-center font-outfit drop-shadow-sm">
              Start free.{" "}
              <u className="underline decoration-white decoration-4 underline-offset-4">
                Stay in control
              </u>{" "}
              if you want to.
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Cloud Card */}
              <div className="group p-10 flex flex-col items-start bg-bg-base border border-border-subtle hover:border-text-primary/40 rounded-3xl shadow-xl transition-all duration-300 cursor-default">
                <div className="w-12 h-12 rounded-full bg-bg-subtle border border-border-subtle flex items-center justify-center mb-6 shadow-sm text-primary-base group-hover:scale-110 transition-transform duration-300">
                  <Mail size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-outfit text-text-primary group-hover:text-primary-base transition-colors duration-300">
                  Hosted, free
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Create a free account and start sending in minutes.
                  FreezyMails runs the queue, the scraper, and the inbox for you
                  - no server to manage.
                </p>
              </div>

              {/* Self-hosted Card */}
              <div className="group p-10 flex flex-col items-start bg-bg-base border border-border-subtle hover:border-text-primary/40 rounded-3xl shadow-xl transition-all duration-300 cursor-default">
                <div className="w-12 h-12 rounded-full bg-bg-subtle border border-border-subtle flex items-center justify-center mb-6 shadow-sm text-text-primary group-hover:scale-110 transition-transform duration-300">
                  <GitMerge size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-outfit text-text-primary group-hover:text-primary-base transition-colors duration-300">
                  Self-hosted, open-source
                </h3>
                <p className="text-text-muted leading-relaxed">
                  FreezyMails is public on GitHub. Clone it, point it at your
                  own Postgres and SMTP/IMAP accounts, and run the same pg-boss
                  job queue on your own infrastructure - no per-send bill, ever.
                </p>
              </div>
            </div>
            <div className="mt-8 text-center text-sm font-medium text-text-muted/70">
              Same product either way. No feature is held back for one path over
              the other.
            </div>
          </ScrollReveal>
        </section>

        {/* --- 4.6 Use Case Spotlight - Job Seekers --- */}
        <section
          id="use-cases"
          className="py-32 bg-bg-base border-y border-border-subtle shadow-skeu-inset"
        >
          <div className="max-w-6xl mx-auto px-8">
            <ScrollReveal>
              <div className="mb-16 max-w-4xl">
                <span className="text-xs uppercase tracking-widest font-bold text-text-muted mb-4 block font-mono">
                  Use Case Spotlight
                </span>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight font-outfit text-text-primary">
                  "Job hunting is a numbers game. FreezyMails makes the numbers{" "}
                  <u className="underline decoration-white decoration-4 underline-offset-4">
                    work in your favor
                  </u>
                  ."
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6">
              {/* Item 1: Bento Full Width */}
              <ScrollReveal
                delay={0.1}
                className="md:col-span-2 bg-bg-subtle/30 border border-border-subtle/50 rounded-2xl p-8 md:p-12 shadow-sm flex flex-col md:flex-row gap-12 items-center"
              >
                <div className="md:w-1/2">
                  <h4 className="text-2xl font-bold mb-4 font-outfit text-text-primary">
                    Skip the manual LinkedIn hunting.
                  </h4>
                  <p className="text-text-muted leading-relaxed">
                    Paste a list of startup URLs and let the Web Extractor find
                    the founders' or HR's email and the company name
                    automatically.
                  </p>
                </div>
                <div className="md:w-1/2 w-full flex">
                  <InteractiveExtractor />
                </div>
              </ScrollReveal>

              {/* Item 2: Bento Bottom Left */}
              <ScrollReveal
                delay={0.2}
                className="bg-bg-subtle/30 border border-border-subtle/50 rounded-2xl p-8 shadow-sm flex flex-col justify-between"
              >
                <div className="mb-12">
                  <h4 className="text-xl font-bold mb-3 font-outfit text-text-primary">
                    Scale without spamming.
                  </h4>
                  <p className="text-text-muted leading-relaxed text-sm">
                    Connect 2-3 personal domains, turn on Slow Drip, and send
                    100+ personalized emails a day spread safely across a 4-hour
                    window.
                  </p>
                </div>
                {/* Visualization: Timeline / Drip */}
                <div className="w-full relative flex items-center justify-between px-2 pt-4 border-t border-dashed border-border-subtle">
                  <div className="text-[10px] text-text-muted absolute -top-5 left-0">
                    9:00 AM
                  </div>
                  <div className="text-[10px] text-text-muted absolute -top-5 right-0">
                    1:00 PM
                  </div>

                  <div className="w-2 h-2 rounded-full bg-primary-base animate-pulse shadow-[0_0_8px_rgba(var(--primary-base),0.8)]"></div>
                  <div className="w-2 h-2 rounded-full bg-border-subtle"></div>
                  <div className="w-2 h-2 rounded-full bg-border-subtle"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-primary-base animate-pulse shadow-[0_0_8px_rgba(var(--primary-base),0.8)]"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="w-2 h-2 rounded-full bg-border-subtle"></div>
                  <div className="w-2 h-2 rounded-full bg-border-subtle"></div>
                </div>
              </ScrollReveal>

              {/* Item 3: Bento Bottom Right */}
              <ScrollReveal
                delay={0.3}
                className="bg-bg-subtle/30 border border-border-subtle/50 rounded-2xl p-8 shadow-sm flex flex-col justify-between"
              >
                <div className="mb-12">
                  <h4 className="text-xl font-bold mb-3 font-outfit text-text-primary">
                    Never lose a reply.
                  </h4>
                  <p className="text-text-muted leading-relaxed text-sm">
                    The AI Sequence engine drafts the application and a 3-day
                    follow-up automatically, while every reply lands in the
                    Unified Inbox.
                  </p>
                </div>
                {/* Visualization: Minimal Inbox */}
                <div className="flex flex-col gap-2.5">
                  <div className="w-full bg-bg-base border border-primary-base/40 rounded-lg p-3 flex items-center justify-between shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success-text"></div>
                      <span className="text-xs text-text-primary font-bold">
                        Re: Engineering Role
                      </span>
                    </div>
                    <span className="text-[10px] text-primary-base font-bold">
                      Just now
                    </span>
                  </div>
                  <div className="w-full bg-bg-base/50 border border-border-subtle rounded-lg p-3 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-border-subtle"></div>
                      <span className="text-xs text-text-muted font-medium">
                        Following up
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted">2d ago</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* --- 4.7 Built On (Tech Credibility Strip) --- */}
        <section className="py-8 bg-bg-subtle text-center font-mono text-sm border-b border-border-subtle overflow-hidden whitespace-nowrap px-8">
          <span className="text-text-muted uppercase tracking-wider text-xs font-bold mr-6">
            Built on
          </span>
          <span className="text-text-primary">
            PostgreSQL · pg-boss · Nodemailer · ImapFlow · Cheerio · PapaParse ·
            Radix UI · Framer Motion
          </span>
          <a
            href="https://github.com/vaibhavgupta5/FreezyMails"
            target="_blank"
            rel="noreferrer"
            className="ml-6 text-primary-base font-bold hover:underline underline-offset-4 decoration-2"
          >
            View the source →
          </a>
        </section>

        {/* --- 4.8 Final CTA --- */}
        <section className="relative isolate py-16 md:py-24 max-w-7xl mx-auto text-center px-4 md:px-8 z-10 bg-text-primary text-bg-base rounded-3xl my-8 md:my-16 shadow-2xl overflow-hidden mx-4 md:mx-auto">
          {/* Gray Spotlight Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none"></div>

          <ScrollReveal className="relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black mb-6 font-outfit text-bg-base">
              Ready to land your{" "}
              <u className="underline decoration-bg-black decoration-4 underline-offset-4">
                dream job
              </u>
              ?
            </h2>
            <p className="text-lg md:text-xl text-bg-subtle mb-10 max-w-2xl mx-auto">
              Set up your accounts, scrape your target list, and let the smart
              queue do the rest.
            </p>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "text-base sm:text-lg px-6 py-5 sm:px-8 sm:py-6 shadow-sm shadow-ice-500/20 bg-bg-base text-text-primary hover:bg-bg-subtle font-bold border-border-subtle",
              )}
            >
              Create Your Free Account <ArrowRight size={20} className="ml-2" />
            </Link>
          </ScrollReveal>
        </section>

        {/* --- 4.9 Footer --- */}
        <footer className="border-t border-border-subtle py-12 text-center text-text-muted relative z-10 px-4">
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-primary-base transition-colors"
            >
              Features
            </Link>
            <Link
              href="#use-cases"
              className="text-sm font-medium hover:text-primary-base transition-colors"
            >
              Use Cases
            </Link>
            <a
              href="https://github.com/vaibhavgupta5/FreezyMails"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium hover:text-primary-base transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-sm flex flex-wrap items-center justify-center gap-1">
            © {new Date().getFullYear()} FreezyMails. Made by{" "}
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
