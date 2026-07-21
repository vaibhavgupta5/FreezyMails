"use client";

import { useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AudienceVisual() {
  const [loadedRows, setLoadedRows] = useState<number[]>([]);

  useLayoutEffect(() => {
    let currentId = 1;
    const interval = setInterval(() => {
      setLoadedRows((prev) => [...prev, currentId]);
      currentId++;
      if (currentId > 7) {
        clearInterval(interval);
      }
    }, 600); // Loads a new row every 600ms

    return () => clearInterval(interval);
  }, []);

 const data = [
  { email: "ceo@startup1.com", name: "Founder 1", company: "Startup 1 Inc", status: "Enriched" },
  { email: "hr@acmecorp.io", name: "Recruiter A", company: "Acme Corp", status: "Valid" },
  { email: "cto@techstack.net", name: "CTO 2", company: "TechStack", status: "Enriched" },
  { email: "founder@newco.com", name: "Founder B", company: "NewCo", status: "Valid" },
  { email: "alex@brightlabs.ai", name: "Alex Morgan", company: "BrightLabs AI", status: "Enriched" },
  { email: "sarah@cloudnest.io", name: "Sarah Chen", company: "CloudNest", status: "Valid" },
  { email: "james@orbitdata.com", name: "James Wilson", company: "OrbitData", status: "Enriched" },
  { email: "maya@pixelworks.co", name: "Maya Patel", company: "PixelWorks", status: "Valid" },
  { email: "daniel@flowstack.dev", name: "Daniel Kim", company: "FlowStack", status: "Enriched" },
  { email: "olivia@launchpad.ai", name: "Olivia Brown", company: "LaunchPad AI", status: "Valid" },
  { email: "michael@novalabs.tech", name: "Michael Davis", company: "NovaLabs", status: "Enriched" },
  { email: "emma@scalegrid.io", name: "Emma Thompson", company: "ScaleGrid", status: "Valid" },
  { email: "noah@vertexsystems.com", name: "Noah Anderson", company: "Vertex Systems", status: "Enriched" },
  { email: "sophia@marketloop.co", name: "Sophia Williams", company: "MarketLoop", status: "Valid" },
  { email: "liam@devforge.io", name: "Liam Johnson", company: "DevForge", status: "Enriched" },
];

  return (
    <div className="bg-bg-subtle rounded-xl border border-border-subtle shadow-skeu-inset aspect-video flex flex-col font-mono text-[10px] overflow-hidden">
      {/* Table Header */}
      <div className="flex gap-2 font-bold text-text-muted uppercase border-b border-border-subtle p-3 bg-bg-base/50">
        <div className="w-1/3">Email</div>
        <div className="w-1/4">Name</div>
        <div className="w-1/4">Company</div>
        <div className="w-1/6">Status</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 p-2 flex flex-col gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((id, index) => {
          const isLoaded = loadedRows.includes(id);
          const rowData = data[index];

          return (
            <div key={id} className="flex gap-2 items-center p-2 rounded hover:bg-bg-base transition-colors h-8">
              <AnimatePresence mode="wait">
                {!isLoaded ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex gap-2 items-center"
                  >
                    <div className="w-1/3 h-2 bg-border-subtle rounded animate-pulse"></div>
                    <div className="w-1/4 h-2 bg-border-subtle rounded animate-pulse"></div>
                    <div className="w-1/4 h-2 bg-border-subtle rounded animate-pulse"></div>
                    <div className="w-1/6 h-2 bg-border-subtle rounded animate-pulse"></div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full flex gap-2 items-center"
                  >
                    <div className="w-1/3 truncate text-primary-base">{rowData.email}</div>
                    <div className="w-1/4 truncate text-text-primary font-sans">{rowData.name}</div>
                    <div className="w-1/4 truncate text-text-muted font-sans">{rowData.company}</div>
                    <div className="w-1/6">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] ${
                        rowData.status === "Enriched" ? "bg-success-bg text-success-text border border-success-border" : "bg-bg-subtle text-text-primary border border-border-subtle"
                      }`}>
                        {rowData.status}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
