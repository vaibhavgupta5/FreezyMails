"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function MobileNav({ hasUser }: { hasUser: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sm:hidden flex items-center ml-4">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-text-primary hover:bg-bg-subtle rounded-md transition-colors"
        aria-label="Open Menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full bg-black z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-10000"
        }`}
      >
        <div className="p-6 flex justify-between items-center">
          <Logo textColor="text-white" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            aria-label="Close Menu"
          >
            <X size={28} />
          </button>
        </div>
        <div className="flex flex-col py-8 px-8 gap-8 items-center mt-10">
          <Link
            href="#features"
            className="text-2xl font-bold text-white/90 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#use-cases"
            className="text-2xl font-bold text-white/90 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Use Cases
          </Link>
          <a
            href="https://github.com/vaibhavgupta5/FreezyMails"
            target="_blank"
            rel="noreferrer"
            className="text-2xl font-bold text-white/90 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            GitHub
          </a>
          <hr className="border-white/10 w-1/2 my-4" />
          {hasUser ? (
            <Link
              href="/dashboard"
              className="text-2xl font-bold text-black bg-white hover:bg-white/90 px-8 py-3 rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-2xl font-bold text-white/90 hover:text-white transition-colors mb-2"
                onClick={() => setIsOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="text-2xl font-bold text-black bg-white hover:bg-white/90 px-8 py-3 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Start Free
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
