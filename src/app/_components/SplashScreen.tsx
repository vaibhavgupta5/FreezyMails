"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Show the splash screen for 1.5s, then gracefully fade out
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 1500);

    return () => {
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden bg-ice-50/90 backdrop-blur-md  -[inset_0_0_200px_rgba(255,255,255,1)]"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      >
        {/* Frozen Ice Cube Grid Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%, transparent 60%, rgba(120,160,255,0.05) 100%),
              linear-gradient(rgba(120,160,255,.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(120,160,255,.05) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            backgroundPosition: "0 0, 0 0, 0 0",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
          }}
        />

        {/* Frosted texture overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none z-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,.5) 10px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, filter: "blur(5px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center gap-4 drop- -2xl"
        >
          <Logo
            showIcon={false}
            textSize="text-6xl"
            textColor="text-surface-900 tracking-tight"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
