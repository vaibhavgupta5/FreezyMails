"use client";

import { createClientBrowser } from "@/lib/supabase-client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export default function LoginForm({ clientId }: { clientId: string }) {
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError(true);
      return;
    }
    const supabase = createClientBrowser();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credentialResponse.credential,
    });

    if (error) {
      setError(true);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex flex-col items-center w-full font-sans relative z-10">
        {/* Centered Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          <div className="border border-border-subtle bg-bg-base rounded-xl p-8 md:p-12 flex flex-col items-center text-center">
            <span className="text-text-muted text-[14px] font-medium mb-2">
              Welcome to FreezyMails
            </span>

            <h1 className="text-[24px] md:text-[28px] font-outfit font-bold text-text-primary tracking-tight mb-4">
              Sign in to your account
            </h1>

            <p className="text-[15px] text-text-muted mb-8 leading-relaxed">
              {error
                ? "Something went wrong signing you in. Please try again."
                : "Use your Google account to continue — no password to set up or remember."}
            </p>

            <div className="w-full flex justify-center mb-6 min-h-[40px]">
              {mounted ? (
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => setError(true)}
                  theme={resolvedTheme === "dark" ? "filled_black" : "outline"}
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                />
              ) : (
                <div className="w-[200px] h-[40px] bg-border-subtle rounded animate-pulse" />
              )}
            </div>

            <p className="text-[13px] text-text-muted">
              By continuing, you agree to FreezyMails&apos;{" "}
              <Link
                href="/terms"
                className="underline hover:text-text-primary underline-offset-2"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline hover:text-text-primary underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </motion.div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-[14px] text-text-muted hover:text-text-primary transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
