"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {  AlertTriangle } from "lucide-react";

export default function DashboardPreview() {
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    // Initial rapid count up
    const timeout = setTimeout(() => {
      setSentCount(436);
    }, 500);

    // Ongoing drip
    const interval = setInterval(() => {
      setSentCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 2500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden bg-bg-base relative h-full">
      {/* Sidebar Mock */}
      <div className="w-64 border-r border-border-subtle bg-bg-subtle/30 p-6 hidden md:flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center text-bg-base font-bold text-xs">FM</div>
          <div className="h-4 bg-border-subtle rounded w-24"></div>
        </div>
        <div className="space-y-4 flex-1">
          <div className="h-8 bg-bg-base border border-border-subtle rounded w-full flex items-center px-3 shadow-sm">
             <div className="w-4 h-4 rounded bg-text-primary/50 mr-3"></div>
             <div className="h-2 bg-text-primary/50 rounded w-16"></div>
          </div>
          <div className="h-8 bg-transparent rounded w-full flex items-center px-3 opacity-50">
             <div className="w-4 h-4 rounded bg-text-muted mr-3"></div>
             <div className="h-2 bg-text-muted rounded w-20"></div>
          </div>
          <div className="h-8 bg-transparent rounded w-full flex items-center px-3 opacity-50">
             <div className="w-4 h-4 rounded bg-text-muted mr-3"></div>
             <div className="h-2 bg-text-muted rounded w-12"></div>
          </div>
        </div>
        
        {/* Bottom sidebar mock */}
        <div className="space-y-3 pt-6 border-t border-border-subtle/50">
          <div className="h-4 bg-transparent rounded w-full flex items-center opacity-50">
             <div className="w-3 h-3 rounded bg-text-muted mr-3"></div>
             <div className="h-1.5 bg-text-muted rounded w-20"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 relative z-10 overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start lg:items-center flex-col lg:flex-row gap-4">
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold font-outfit text-text-primary mb-1"
            >
              Good morning, Baby
            </motion.h2>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-text-muted"
            >
              Thursday, 12 October
            </motion.div>
          </div>
          <div className="h-9 w-32 bg-text-primary text-bg-base rounded-md shadow-sm flex items-center justify-center text-xs font-bold px-3">
             + New campaign
          </div>
        </div>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Sending Volume Chart */}
          <div className="bg-bg-base rounded-xl border border-border-subtle p-5 lg:col-span-2 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1">
                Sending Volume (7d)
              </h2>
              <div className="flex items-baseline gap-2">
                <AnimatePresence mode="popLayout">
                  <motion.span 
                    key={sentCount}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-3xl font-black font-outfit text-text-primary"
                  >
                    {sentCount}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-text-muted">emails sent</span>
              </div>
            </div>

            <div className="flex items-end gap-2 h-32 mt-6 pt-4 border-t border-border-subtle relative z-10">
              {[15, 30, 45, 20, 60, 85, 40].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                  <div className="w-full relative flex items-end justify-center h-full rounded-sm bg-bg-subtle/50 overflow-hidden">
                    <motion.div
                      initial={{ height: "0%" }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.1 + 0.3, type: "spring" }}
                      className="w-full bg-primary-base rounded-sm"
                    />
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                    {["M","T","W","T","F","S","S"][i]}
                  </span>
                </div>
              ))}
            </div>
            {/* Subtle glow */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-base/5 blur-3xl rounded-full z-0 pointer-events-none"></div>
          </div>

          {/* Domain Health */}
          <div className="bg-bg-base rounded-xl border border-border-subtle p-5 flex flex-col justify-between shadow-sm">
            <div>
              <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1">
                Domain Health
              </h2>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black font-outfit text-text-primary">98<span className="text-sm font-medium text-text-muted">/100</span></div>
                <span className="text-xs text-success-text font-bold bg-success-bg/20 px-2 py-0.5 rounded">Healthy</span>
              </div>
            </div>
            
            <div className="space-y-3 mt-6 pt-4 border-t border-border-subtle text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Bounce Rate</span>
                <span className="font-bold text-success-text">0.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Active Accounts</span>
                <span className="font-bold text-text-primary">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Warming Up</span>
                <span className="font-bold text-text-primary">0</span>
              </div>
            </div>
          </div>

        </div>

        {/* Lower Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Active Campaigns */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
                Active Campaigns
              </h2>
              <div className="text-[10px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                View all &rarr;
              </div>
            </div>

            <div className="bg-bg-base rounded-xl border border-border-subtle divide-y divide-border-subtle overflow-hidden shadow-sm">
              {[
                { name: "Senior Dev Outreach", progress: 65, sent: 325, total: 500, status: 'SENDING' },
                { name: "Y-Combinator Founders", progress: 12, sent: 12, total: 100, status: 'SENDING' },
                { name: "Follow-up: Q3 Targets", progress: 100, sent: 200, total: 200, status: 'PAUSED' }
              ].map((camp, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-bg-subtle/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${camp.status === 'SENDING' ? 'bg-success-text animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-warning-text'}`}></div>
                      <h3 className="text-sm font-bold text-text-primary truncate">{camp.name}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px] h-1.5 bg-bg-subtle rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: `${camp.progress}%` }}
                          transition={{ delay: 0.5 + i * 0.2, duration: 1 }}
                          className={`h-full ${camp.status === 'SENDING' ? 'bg-primary-base' : 'bg-text-muted'}`}
                        ></motion.div>
                      </div>
                      <span className="text-xs text-text-muted font-mono">{camp.sent} / {camp.total}</span>
                    </div>
                  </div>
                  <div className="ml-4 px-3 py-1.5 rounded text-[10px] font-bold text-text-primary bg-bg-subtle border border-border-subtle shrink-0">
                    Manage
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
                Needs Attention
              </h2>
            </div>
            
            <div className="bg-bg-base rounded-xl border border-border-subtle divide-y divide-border-subtle overflow-hidden shadow-sm">
              <div className="flex items-start gap-3 p-3">
                <div className="w-6 h-6 rounded-md bg-warning-bg border border-warning-border flex items-center justify-center shrink-0">
                  <AlertTriangle size={12} className="text-warning-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-text-primary truncate">
                    Delivery Issue: ceo@acme.com
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    Senior Dev Outreach · Bounced
                  </p>
                </div>
                <span className="text-[10px] text-text-muted shrink-0">2h ago</span>
              </div>

              <div className="flex items-start gap-3 p-3">
                <div className="w-6 h-6 rounded-md bg-bg-subtle border border-border-subtle flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-text-muted">D</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-text-primary truncate">
                    Draft: Remote CTOs
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    45 recipients ready to send
                  </p>
                </div>
                <span className="text-[10px] text-text-muted shrink-0">1d ago</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
