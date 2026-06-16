"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import PageSkeleton from "../_components/PageSkeleton";
import { useInboxStore } from "@/stores/useInboxStore";

const PAGE_SIZE = 10;

export default function InboxPage() {
  const { replies, loading, fetchReplies, forceRefresh } = useInboxStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchReplies();
    
    // Polling every 60 seconds
    const interval = setInterval(() => {
      forceRefresh();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchReplies, forceRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await forceRefresh();
    setIsRefreshing(false);
  };

  const totalPages = Math.ceil(replies.length / PAGE_SIZE);
  const paginatedReplies = replies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading && replies.length === 0) return <PageSkeleton />;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Unified Inbox</h1>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded shadow-sm text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin text-ice-500" : "text-surface-400"} />
          Refresh
        </button>
      </div>

      {replies.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 shadow-skeu-base">
          <Inbox size={64} className="text-surface-300 dark:text-surface-600" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              No replies yet
            </h3>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              {"Once prospects reply to your campaigns, they'll appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="skeu-card p-0 divide-y divide-surface-200 dark:divide-surface-700 overflow-hidden shadow-skeu-base border border-surface-200 dark:border-surface-700">
            {paginatedReplies.map((reply) => (
              <Link
                key={reply.id}
                href={`/inbox/${reply.id}`}
                className={`block p-4 transition-colors ${
                  !reply.isRead 
                    ? "bg-ice-50 dark:bg-ice-900/20 border-l-4 border-ice-500 hover:bg-ice-100 dark:hover:bg-ice-900/40" 
                    : "bg-white dark:bg-surface-800 border-l-4 border-transparent hover:bg-surface-50 dark:hover:bg-surface-700"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm ${!reply.isRead ? "text-ice-800 dark:text-ice-200 font-semibold" : "text-surface-500 dark:text-surface-400"}`}>
                    {reply.campaign.name}
                  </span>
                  <span className={`text-xs ${!reply.isRead ? "text-ice-600 dark:text-ice-400 font-medium" : "text-surface-400 dark:text-surface-500"}`}>
                    {new Date(reply.receivedAt).toLocaleString()}
                  </span>
                </div>
                <div className={`text-lg mb-1 ${!reply.isRead ? "text-surface-900 dark:text-surface-50 font-bold" : "text-surface-700 dark:text-surface-300 font-medium"}`}>
                  {reply.fromEmail}
                </div>
                <div className={`text-sm truncate ${!reply.isRead ? "text-surface-800 dark:text-surface-200 font-medium" : "text-surface-600 dark:text-surface-400"}`}>
                  {reply.subject}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-white dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700">
              <span className="text-sm text-surface-500 dark:text-surface-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, replies.length)} of {replies.length} replies
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-surface-200 dark:border-surface-700 rounded text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-surface-200 dark:border-surface-700 rounded text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
