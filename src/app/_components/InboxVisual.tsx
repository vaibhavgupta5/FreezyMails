"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, CornerDownRight } from "lucide-react";

export default function InboxVisual() {
  const [messages, setMessages] = useState<number[]>([]);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count <= 3) {
        setMessages((prev) => [count, ...prev]);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const data = [
    { name: "John Doe", title: "Interested in the role", domain: "gmail.com", avatar: "JD" },
    { name: "Alice Smith", title: "Re: Quick question...", domain: "personal.me", avatar: "AS" },
    { name: "Mark Roe", title: "Following up", domain: "outlook.com", avatar: "MR" },
  ];

  return (
    <div className="bg-bg-subtle rounded-xl border border-border-subtle shadow-skeu-inset aspect-video flex flex-col overflow-hidden">
      {/* Inbox Header */}
      <div className="h-10 border-b border-border-subtle bg-bg-base flex items-center px-4 justify-between">
        <div className="font-bold text-sm">Unified Inbox</div>
        <div className="flex gap-2">
          <span className="w-4 h-4 rounded-full bg-primary-base/20 border border-primary-base flex items-center justify-center text-[8px] font-bold text-primary-base">G</span>
          <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-[8px] font-bold text-blue-500">P</span>
          <span className="w-4 h-4 rounded-full bg-success-text/20 border border-success-text flex items-center justify-center text-[8px] font-bold text-success-text">O</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-2 flex flex-col gap-2 relative overflow-hidden">
        <AnimatePresence>
          {messages.map((id) => {
            const msg = data[id - 1];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className="w-full bg-bg-base border border-border-subtle rounded p-3 flex gap-3 shadow-sm hover:border-primary-base transition-colors group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-sm truncate">{msg.name}</div>
                    <div className="text-[10px] text-text-muted">Just now</div>
                  </div>
                  <div className="text-xs font-medium text-text-primary truncate mb-2">{msg.title}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 bg-bg-subtle px-1.5 py-0.5 rounded">
                      <CornerDownRight size={10} /> {msg.domain}
                    </div>
                    <div className="text-xs font-bold text-primary-base opacity-0 group-hover:opacity-100 transition-opacity">
                      Reply
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted opacity-50">
            <User size={24} className="mb-2" />
            <span className="text-xs">Waiting for replies...</span>
          </div>
        )}
      </div>
    </div>
  );
}
