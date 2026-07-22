import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { getUser } from "@/lib/supabase";

export async function MarketingHeader() {
  const user = await getUser();
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-bg-base/80 backdrop-blur-xl border border-border-subtle shadow-lg shadow-black/5 rounded-lg px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-6 sm:gap-12 transition-all duration-300 w-full max-w-7xl mx-auto">
        <Logo textColor="text-text-primary drop-shadow-sm" />
        <div className="flex items-center">
          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/#features"
              className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all"
            >
              Features
            </Link>
            <Link
              href="/#use-cases"
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
            {/* {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all mr-2"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium hover:underline underline-offset-4 decoration-2 decoration-transparent hover:decoration-primary-base transition-all mr-2"
              >
                Log in
              </Link>
            )} */}
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
  );
}
