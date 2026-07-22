"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, ChevronRight, ArrowLeft, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useLayoutStore } from "@/stores/useLayoutStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const segments = (pathname || "").split("/").filter(Boolean);

  return (
    <header className="h-16 border-b border-border-subtle bg-bg-subtle flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shrink-0">
      <div
        className="flex items-center text-sm text-text-muted flex-1 min-w-0 overflow-x-auto whitespace-nowrap mr-2 sm:mr-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <Button
          variant="none"
          onClick={() => router.back()}
          className="p-1 mr-3 rounded hover:bg-border-subtle text-text-muted transition-colors flex items-center justify-center cursor-pointer hidden md:flex shrink-0"
          title="Go back"
        >
          <ArrowLeft size={16} />
        </Button>
        <Button
          variant="none"
          onClick={useLayoutStore((state) => state.toggleMobileSidebar)}
          className="p-1 mr-3 rounded hover:bg-border-subtle text-text-muted transition-colors flex items-center justify-center cursor-pointer md:hidden shrink-0"
          title="Toggle Menu"
        >
          <Menu size={20} />
        </Button>
        <Link
          href="/dashboard"
          className="hover:text-text-primary transition-colors shrink-0"
        >
          Home
        </Link>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const title = segment.charAt(0).toUpperCase() + segment.slice(1);
          return (
            <div key={segment} className="flex items-center shrink-0">
              <ChevronRight
                size={16}
                className="mx-1 text-text-muted shrink-0"
              />
              {isLast ? (
                <span
                  className="text-text-primary font-medium truncate max-w-[120px] sm:max-w-[200px]"
                  title={title}
                >
                  {title.substring(0, 20)}
                </span>
              ) : (
                <Link
                  href={`/${segments.slice(0, index + 1).join("/")}`}
                  className="hover:text-text-primary transition-colors truncate max-w-[100px] sm:max-w-[150px]"
                  title={title}
                >
                  {title.substring(0, 20)}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {mounted && (
        <Button
          variant="none"
          onClick={() => {
            console.log("Current theme before click:", theme);
            const nextTheme = theme === "dark" ? "light" : "dark";
            console.log("Setting theme to:", nextTheme);
            setTheme(nextTheme);
          }}
          className="p-2 rounded-full bg-bg-base hover:bg-bg-base text-text-muted hover:text-primary-base transition-colors border border-border-subtle cursor-pointer"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      )}
    </header>
  );
}
