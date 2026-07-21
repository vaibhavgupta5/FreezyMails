"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {  CornerDownRight, Loader2 } from "lucide-react";

export default function AISequenceVisual() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const cycle = async () => {
      while (true) {
        setStage(0);
        await new Promise((r) => setTimeout(r, 1000));
        setStage(1); // Generating step 1
        await new Promise((r) => setTimeout(r, 1500));
        setStage(2); // Generating step 2
        await new Promise((r) => setTimeout(r, 1500));
        setStage(3); // Generating step 3
        await new Promise((r) => setTimeout(r, 4000));
      }
    };
    cycle();
  }, []);

  return (
    <div className="bg-bg-subtle rounded-xl border border-border-subtle overflow-hidden shadow-skeu-inset relative">
      {/* Input Prompt Section */}
      <div className="p-6 border-b border-border-subtle bg-bg-base/50">
        <div className="flex gap-4 mb-4">
         
          <div className="flex-1">
            <div className="text-sm font-bold text-text-primary mb-2">Generate Sequence</div>
            <div className="bg-bg-base border border-border-subtle rounded-lg p-3 text-sm text-text-muted font-mono flex flex-col gap-1 shadow-sm">
              <div><span className="text-primary-base font-bold">ICP:</span> VP of Eng at Series B</div>
              <div><span className="text-primary-base font-bold">Offer:</span> Senior React Dev</div>
              <div><span className="text-primary-base font-bold">Tone:</span> Direct & Technical</div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Generation Section */}
      <div className="p-6 min-h-[250px] bg-bg-base flex flex-col gap-4 relative">
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-subtle border border-border-subtle rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-text-primary">Step 1 — Initial email</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-base px-2 py-1 rounded">Day 1</span>
              </div>
              <div className="text-xs font-mono text-text-muted border-l-2 border-primary-base pl-3 py-1">
                <Typewriter text="Subject: Quick question about your frontend stack..." delay={0} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage >= 2 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-bg-subtle/70 border border-border-subtle rounded-lg p-4 ml-6 relative shadow-sm"
            >
              <div className="absolute -left-6 top-6 text-border-subtle">
                <CornerDownRight size={16} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-text-primary">Step 2 — Follow-up</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-base px-2 py-1 rounded">+ 3 days</span>
              </div>
              <div className="text-xs font-mono text-text-muted border-l-2 border-border-subtle pl-3 py-1">
                <Typewriter text="Re: Any thoughts on the above? I noticed..." delay={0} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-bg-subtle/40 border border-border-subtle rounded-lg p-4 ml-12 relative shadow-sm"
            >
              <div className="absolute -left-6 top-6 text-border-subtle">
                <CornerDownRight size={16} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-text-primary">Step 3 — Final Check</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-base px-2 py-1 rounded">+ 4 days</span>
              </div>
              <div className="text-xs font-mono text-text-muted border-l-2 border-border-subtle pl-3 py-1">
                <Typewriter text="Hey, I won't bug you again, but just wanted to..." delay={0} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {stage > 0 && stage < 3 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-2 left-6 flex items-center gap-2 text-xs font-medium text-text-muted"
          >
           Generating... <Loader2 className="animate-spin" size={16} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Helper component for typewriter effect
function Typewriter({ text, delay }: { text: string; delay: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i));
        i++;
        if (i > text.length) {
          clearInterval(interval);
        }
      }, 30); // Typing speed
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span>
      {displayedText}
      <span className="animate-pulse">_</span>
    </span>
  );
}
