"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_STEPS = [
  {
    id: "accounts",
    selector: 'a[href="/accounts"]',
    text: "Connect your email accounts to start sending.",
    side: "right" as const,
  },
  {
    id: "templates",
    selector: 'a[href="/templates"]',
    text: "Draft your email sequences and variants.",
    side: "right" as const,
  },
  {
    id: "audience",
    selector: 'a[href="/audience"]',
    text: "Import your contacts and target audience.",
    side: "right" as const,
  },
  {
    id: "campaigns",
    selector: 'a[href="/campaigns"]',
    text: "Launch and orchestrate your outreach.",
    side: "right" as const,
  },
];

const STORAGE_KEY = "freezymails_tour_completed";

export function DashboardTour({ forceOpen, onCloseForce }: { forceOpen?: boolean, onCloseForce?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      setMounted(true);
      const hasSeenTour = localStorage.getItem(STORAGE_KEY) === "true";
      if (!hasSeenTour || forceOpen) {
        setIsOpen(true);
        if (forceOpen) setStepIndex(0);
      }
    }, 0);

    return () => clearTimeout(initTimer);
  }, [forceOpen]);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updatePosition = () => {
      const step = TOUR_STEPS[stepIndex];
      const el = document.querySelector(step.selector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        // If element is not found (e.g., sidebar collapsed on mobile), try to find it again shortly
        setTimeout(() => {
          const retryEl = document.querySelector(step.selector);
          if (retryEl) setTargetRect(retryEl.getBoundingClientRect());
        }, 500);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [stepIndex, isOpen, mounted]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
    if (onCloseForce) onCloseForce();
  };

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  if (!mounted || !isOpen || !targetRect) return null;

  const currentStep = TOUR_STEPS[stepIndex];

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && handleClose()} modal={false}>
      <PopoverTrigger asChild>
        <div
          className="fixed pointer-events-none z-50"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        side={currentStep.side}
        sideOffset={16}
        className="w-64 p-4 shadow-xl z-[100]"
        onInteractOutside={handleClose}
        onEscapeKeyDown={handleClose}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            <p className="text-[14px] text-text-primary leading-relaxed font-sans">
              {currentStep.text}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[12px] text-text-muted font-medium">
                {stepIndex + 1} of {TOUR_STEPS.length}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 text-xs px-2 text-text-muted hover:text-text-primary">
                  Skip
                </Button>
                <Button variant="primary" size="sm" onClick={handleNext} className="h-7 text-xs px-3">
                  {stepIndex === TOUR_STEPS.length - 1 ? "Done" : "Next"}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
