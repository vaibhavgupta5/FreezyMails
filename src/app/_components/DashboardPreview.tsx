"use client";

import { useEffect, useState } from "react";
import { Mail, Send, Inbox, MousePointer2 } from "lucide-react";

export default function DashboardPreview() {
  const [sentCount, setSentCount] = useState(124);
  const [openCount, setOpenCount] = useState(48);
  const [replyCount, setReplyCount] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setSentCount((prev) => prev + Math.floor(Math.random() * 3));

      if (Math.random() > 0.5) {
        setOpenCount((prev) => prev + 1);
      }

      if (Math.random() > 0.8) {
        setReplyCount((prev) => prev + 1);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden bg-surface-50">
      {/* Sidebar Mock */}
      <div className="w-48 border-r border-surface-300 bg-surface-100 p-4 hidden md:flex flex-col gap-3">
        <div className="h-8 bg-surface-200 rounded animate-pulse w-3/4 mb-4"></div>
        <div className="h-6 bg-surface-200 rounded w-full"></div>
        <div className="h-6 bg-surface-200 rounded w-5/6"></div>
        <div className="h-6 bg-surface-200 rounded w-full"></div>
        <div className="h-6 bg-surface-200 rounded w-4/6"></div>
      </div>

      {/* Main Content Mock */}
      <div className="flex-1 p-6 flex flex-col gap-6 relative">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-surface-300 rounded w-40 animate-pulse"></div>
          <div className="h-8 w-24 bg-ice-500 rounded-lg animate-pulse opacity-50"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-100 rounded-xl border border-surface-400 p-4  -skeu-raised flex flex-col items-center justify-center transform transition-all duration-300 hover:scale-105">
            <Send className="text-blue-500 mb-2" size={24} />
            <span className="text-sm text-surface-600 font-medium">
              Emails Sent
            </span>
            <span className="text-3xl font-bold text-surface-900">
              {sentCount}
            </span>
          </div>

          <div className="bg-surface-100 rounded-xl border border-surface-400 p-4  -skeu-raised flex flex-col items-center justify-center transform transition-all duration-300 hover:scale-105">
            <Mail className="text-amber-500 mb-2" size={24} />
            <span className="text-sm text-surface-600 font-medium">Opened</span>
            <span className="text-3xl font-bold text-surface-900">
              {openCount}
            </span>
          </div>

          <div className="bg-surface-100 rounded-xl border border-surface-400 p-4  -skeu-raised flex flex-col items-center justify-center transform transition-all duration-300 hover:scale-105">
            <Inbox className="text-emerald-500 mb-2" size={24} />
            <span className="text-sm text-surface-600 font-medium">
              Replies
            </span>
            <span className="text-3xl font-bold text-surface-900">
              {replyCount}
            </span>
          </div>
        </div>

        {/* Chart Mock (Animated Bars) */}
        <div className="flex-1 bg-surface-100 border border-surface-400 rounded-xl  -skeu-inset p-4 flex items-end gap-2 overflow-hidden relative">
          {[40, 60, 45, 80, 50, 75, 90, 65, 85, 100].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-ice-600 to-ice-400 rounded-t-sm  -sm origin-bottom animate-pulse"
              style={{
                height: `${height}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: "2s",
              }}
            ></div>
          ))}

          {/* Animated cursor pointing */}
          <div
            className="absolute z-10 bottom-1/4 right-1/4 animate-bounce"
            style={{ animationDuration: "3s" }}
          >
            <MousePointer2 className="text-surface-900 drop- -md" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}
