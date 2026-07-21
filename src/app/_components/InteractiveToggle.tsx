"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function InteractiveToggle() {
  const [isSlow, setIsSlow] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-bg-subtle rounded-xl border border-border-subtle shadow-skeu-inset relative overflow-hidden min-h-[300px]">
      
      {/* Dynamic Status Alert */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-20">
        <AnimatePresence mode="wait">
          {!isSlow ? (
            <motion.div
              key="fast-alert"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-warning-bg/10 border border-warning-border/50 text-warning-text px-4 py-2 rounded-lg flex items-center gap-3 text-sm font-medium shadow-sm"
            >
              <AlertTriangle size={16} />
              Spam filter risk: 50 emails sent in 1s
            </motion.div>
          ) : (
            <motion.div
              key="slow-alert"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-success-bg/10 border border-success-border/50 text-success-text px-4 py-2 rounded-lg flex items-center gap-3 text-sm font-medium shadow-sm"
            >
              <CheckCircle2 size={16} />
              Sent safely: 1 email every 12 mins
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle */}
      <div className="flex bg-bg-base p-1 rounded-full border border-border-subtle mt-16 mb-8 relative z-10 shadow-sm">
        <button
          onClick={() => setIsSlow(false)}
          className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
            !isSlow ? "text-primary-text" : "text-text-muted hover:text-text-primary"
          }`}
        >
          {!isSlow && (
            <motion.div
              layoutId="toggle-bg"
              className="absolute inset-0 bg-primary-base rounded-full -z-10 shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          Fast Drip
        </button>
        <button
          onClick={() => setIsSlow(true)}
          className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors ${
            isSlow ? "text-primary-text" : "text-text-muted hover:text-text-primary"
          }`}
        >
          {isSlow && (
            <motion.div
              layoutId="toggle-bg"
              className="absolute inset-0 bg-primary-base rounded-full -z-10 shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          Slow Drip
        </button>
      </div>

      {/* Timeline Visualization */}
      <div className="w-full relative h-24 flex flex-col items-center justify-center mt-4">
        
        {/* Timeline Labels */}
        <div className="absolute top-0 w-full flex justify-between px-4 text-xs font-mono text-text-muted">
          <span>09:00 AM</span>
          <span>01:00 PM</span>
        </div>

        {/* Axis line */}
        <div className="absolute left-4 right-4 h-px bg-border-subtle top-1/2 -translate-y-1/2"></div>
        
        {/* Window highlight for slow drip */}
        {isSlow && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="absolute h-12 bg-primary-base/10 border-x border-primary-base/30 w-full left-0 rounded-sm top-1/2 -translate-y-1/2"
          ></motion.div>
        )}

        {/* Dots */}
        <div className="absolute inset-x-4 top-0 bottom-0">
          {[...Array(12)].map((_, i) => {
            // Fast drip: clustered at the start
            // Slow drip: scattered randomly across the whole window
            const fastX = (i * 3);
            
            // Use a stable pseudo-random value based on index to keep render pure
            const pseudoRandom = Math.abs(Math.sin(i + 1) * 10000 % 1);
            
            const slowX = 5 + pseudoRandom * 90;

            return (
              <motion.div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full bg-primary-base top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,136,204,0.8)]"
                animate={{
                  left: `${isSlow ? slowX : fastX}%`,
                  scale: isSlow ? 1 : 1,
                  opacity: isSlow ? [0, 1] : 1
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  delay: isSlow ? pseudoRandom * 0.5 : i * 0.02,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
