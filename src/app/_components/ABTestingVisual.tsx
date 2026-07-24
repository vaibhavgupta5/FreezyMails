"use client";

import { useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";

export default function ABTestingVisual() {
  const [emails, setEmails] = useState<{ id: number; variant: "A" | "B" }[]>([]);

  useLayoutEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      const variant: "A" | "B" = Math.random() > 0.5 ? "A" : "B";
      
      setEmails((prev) => [...prev, { id: count, variant }].slice(-5));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-[350px] bg-bg-subtle rounded-xl border border-border-subtle p-8 shadow-skeu-inset flex flex-col items-center justify-between font-mono text-sm relative overflow-hidden">
      
      {/* Hash Engine */}
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
          <div className="px-3 py-1.5 bg-bg-base border border-border-subtle rounded shadow-sm text-xs text-text-muted">recipient_id</div>
          <span className="text-lg text-text-muted">+</span>
          <div className="px-3 py-1.5 bg-bg-base border border-border-subtle rounded shadow-sm text-xs text-text-muted">campaign_id</div>
        </div>
        
        <div className="px-6 py-2 bg-primary-base text-primary-text font-bold rounded-full shadow-lg flex items-center gap-2">
          deterministic_hash()
        </div>
      </div>

      {/* Falling Emails */}
      <div className="absolute top-[120px] bottom-[100px] left-0 right-0 pointer-events-none">
        <AnimatePresence>
          {emails.map((email) => (
            <motion.div
              key={email.id}
              initial={{ y: 0, opacity: 0, scale: 0.5, x: "-50%" }}
              animate={{ 
                y: 120, 
                opacity: [0, 1, 1, 0], 
                scale: 1, 
                x: email.variant === "A" ? "-150%" : "50%" 
              }}
              transition={{ duration: 1, ease: "easeIn" }}
              className={`absolute left-1/2 flex items-center justify-center w-8 h-8 rounded shadow-sm border ${
                email.variant === "A" ? "bg-primary-base/20 border-primary-base text-primary-base" : "bg-bg-base border-border-subtle text-text-muted"
              }`}
            >
              <Mail size={14} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Buckets */}
      <div className="flex gap-4 w-full max-w-md relative z-10">
        {/* Variant A Bucket */}
        <div className="flex-1 bg-bg-base border-t-4 border-primary-base rounded-b-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 text-center border-b border-border-subtle">
            <div className="font-bold text-text-primary mb-1">Variant A (Direct)</div>
            <div className="text-primary-base text-xs font-bold">18% Reply Rate</div>
          </div>
          <div className="h-2 bg-bg-subtle w-full relative">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-primary-base" 
              initial={{ width: "0%" }}
              animate={{ width: "28%" }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        
        {/* Variant B Bucket */}
        <div className="flex-1 bg-bg-base border-t-4 border-border-subtle rounded-b-lg shadow-sm overflow-hidden flex flex-col opacity-80">
          <div className="p-3 text-center border-b border-border-subtle">
            <div className="font-bold text-text-primary mb-1">Variant B (Soft)</div>
            <div className="text-text-muted text-xs">2% Reply Rate</div>
          </div>
          <div className="h-2 bg-bg-subtle w-full relative">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-border-subtle" 
              initial={{ width: "0%" }}
              animate={{ width: "15%" }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
