"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="h-16 border-b border-surface-400 bg-surface-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center text-sm text-surface-600">
        <Link href="/dashboard" className="hover:text-surface-900 transition-colors">
          Home
        </Link>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const title = segment.charAt(0).toUpperCase() + segment.slice(1);
          return (
            <div key={segment} className="flex items-center">
              <ChevronRight size={16} className="mx-1 text-surface-400" />
              {isLast ? (
                <span className="text-surface-900 font-medium truncate max-w-[200px]">{title}</span>
              ) : (
                <Link href={`/${segments.slice(0, index + 1).join('/')}`} className="hover:text-surface-900 transition-colors truncate max-w-[150px]">
                  {title}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {mounted && (
        <button
          onClick={() => {
            console.log('Current theme before click:', theme);
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            console.log('Setting theme to:', nextTheme);
            setTheme(nextTheme);
          }}
          className="p-2 rounded-full bg-surface-100 hover:bg-surface-50 text-surface-600 hover:text-ice-600 transition-colors border border-surface-400"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      )}
    </header>
  );
}
