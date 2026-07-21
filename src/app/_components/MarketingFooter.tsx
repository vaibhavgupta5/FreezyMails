import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle py-12 text-center text-text-muted relative z-10 px-4 mt-auto">
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        <Link
          href="/#features"
          className="text-sm font-medium hover:text-primary-base transition-colors"
        >
          Features
        </Link>
        <Link
          href="/#use-cases"
          className="text-sm font-medium hover:text-primary-base transition-colors"
        >
          Use Cases
        </Link>
        <Link
          href="/privacy"
          className="text-sm font-medium hover:text-primary-base transition-colors"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="text-sm font-medium hover:text-primary-base transition-colors"
        >
          Terms of Service
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
  );
}
