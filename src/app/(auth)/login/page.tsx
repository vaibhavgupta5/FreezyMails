import { getUser } from "@/lib/supabase";
import { MarketingHeader } from "@/app/_components/MarketingHeader";
import { MarketingFooter } from "@/app/_components/MarketingFooter";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | FreezyMails",
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  // Pass GOOGLE_CLIENT_ID from server so we don't need NEXT_PUBLIC prefix.
  const clientId = process.env.GOOGLE_CLIENT_ID || "";

  return (
    <div className="min-h-[80dvh] flex flex-col bg-bg-subtle text-text-primary font-sans selection:bg-primary-base selection:text-primary-text relative overflow-hidden px-2">
      <div
        className="fixed inset-0 z-[100] pointer-events-none opacity-[0.02] transform-gpu"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      <MarketingHeader />

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-8 py-32 md:pt-36 md:pb-8 ">
        <LoginForm clientId={clientId} />
      </main>

      <MarketingFooter />
    </div>
  );
}
