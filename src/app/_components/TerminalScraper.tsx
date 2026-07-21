"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, CheckCircle2, Search, AlertCircle } from "lucide-react";

export default function TerminalScraper() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const cycle = async () => {
      while (true) {
        setStep(0);
        await new Promise((r) => setTimeout(r, 1000));
        setStep(1);
        await new Promise((r) => setTimeout(r, 1500));
        setStep(2);
        await new Promise((r) => setTimeout(r, 800));
        setStep(3);
        await new Promise((r) => setTimeout(r, 2000));
        setStep(4);
        await new Promise((r) => setTimeout(r, 4000));
      }
    };
    cycle();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto bg-bg-subtle rounded-xl border border-border-subtle shadow-2xl overflow-hidden font-mono text-sm relative">
      {/* Terminal Header */}
      <div className="h-10 border-b border-border-subtle bg-bg-base flex items-center px-4 gap-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-text"></div>
          <div className="w-3 h-3 rounded-full bg-warning-text"></div>
          <div className="w-3 h-3 rounded-full bg-success-text"></div>
        </div>
        <div className="text-text-muted text-xs flex items-center gap-2">
          <Terminal size={14} /> web_extractor_worker.js
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 h-full flex flex-col gap-3 text-text-primary">
        
        {/* Step 0: Init */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
          <span className="text-success-text shrink-0">➜</span>
          <span><span className="text-primary-base font-bold">job_queue</span> process --job <span className="text-text-primary font-bold">enrich_target</span> --url <span className="text-text-primary font-bold">stripe.com</span></span>
        </motion.div>

        {/* Step 1: Scrape Homepage */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex gap-3 text-text-muted"
            >
              <Search size={16} className="shrink-0 mt-0.5" />
              <span>[1/2] Scraping homepage... looking for mailto: or regex patterns...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Failed Homepage */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex gap-3 text-warning-text"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>No direct contacts found on homepage.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Deep Crawl */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex gap-3 text-text-muted"
            >
              <Search size={16} className="shrink-0 mt-0.5 animate-pulse" />
              <span>[2/2] Initiating Deep Crawl on /about, /team, and /careers...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Success */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="mt-4 p-4 rounded bg-success-text/10 border border-success-text/30 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-success-text font-bold mb-2">
                <CheckCircle2 size={16} /> Contact Extracted Successfully!
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <div className="text-text-muted">Target:</div>
                <div className="text-text-primary font-bold">Stripe</div>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <div className="text-text-muted">Found:</div>
                <div className="text-success-text font-bold bg-success-text/10 px-2 py-0.5 rounded w-fit">
                  patrick@stripe.com
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <div className="text-text-muted">Metadata:</div>
                <div className="text-primary-base font-bold">Title: Founder & CEO</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Blinking Cursor */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: [1, 0] }} 
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="flex gap-3 mt-4"
            >
              <span className="text-success-text">➜</span>
              <span className="w-2 h-4 bg-text-primary"></span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
