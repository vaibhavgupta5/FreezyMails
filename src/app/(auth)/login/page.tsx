"use client";

import { createClientBrowser } from "@/lib/supabase-client";
import { Logo } from "@/components/ui/Logo";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClientBrowser();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
        },
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="skeu-page flex min-h-[100dvh] flex-col items-center justify-center p-4 relative">
      {/* Top Navbar */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="skeu-btn-ghost text-xs py-1.5 px-3">
          &larr; Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md">
        <Card className="skeu-card flex flex-col gap-6 p-8">
          <div className="flex flex-col items-center gap-2">
            <Logo showIcon={false} textSize="text-2xl" textColor="text-text-primary" />
            <h2 className="text-xl font-semibold tracking-tight text-text-primary mt-2">
              Welcome back
            </h2>
            <p className="text-sm text-text-muted text-center">
              Sign in to your account to manage your outreach campaigns.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={handleLogin}
              isLoading={loading}
              className="w-full py-5 text-sm font-medium"
            >
              {!loading && (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="currentColor"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="currentColor"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="currentColor"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="currentColor"
                  />
                </svg>
              )}
              <span>{loading ? "Connecting..." : "Continue with Google"}</span>
            </Button>
          </div>

          <div className="border-t border-border-subtle pt-4 text-center">
            <p className="text-xs text-text-muted">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-text-primary">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-text-primary">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

