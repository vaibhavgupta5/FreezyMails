"use client";

import { useEffect, useState, useMemo } from "react";
import {
 Inbox,
 RefreshCw,
 ChevronLeft,
 ChevronRight,
 Search,
} from "lucide-react";
import PageSkeleton from "../_components/PageSkeleton";
import { useInboxStore } from "@/stores/useInboxStore";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import EmailDetailDrawer from "./_components/EmailDetailDrawer";
import { toast } from "sonner";

const PAGE_SIZE = 15;

export default function InboxPage() {
 const {
 replies,
 loading,
 fetchReplies,
 forceRefresh,
 searchQuery,
 setSearchQuery,
 filterType,
 setFilterType,
 } = useInboxStore();

 const [currentPage, setCurrentPage] = useState(1);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

 const handleBulkAction = async (action: string) => {
 try {
 const res = await fetch('/api/replies/bulk', {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ids: Array.from(selectedIds), action })
 });
 if (!res.ok) throw new Error('Bulk action failed');
 toast.success('Action applied');
 setSelectedIds(new Set());
 forceRefresh();
 } catch (_err: unknown) { const err = _err as Error;
 toast.error(err.message);
 }
 };

 useEffect(() => {
 fetchReplies();
 const interval = setInterval(() => forceRefresh(), 60000);
 return () => clearInterval(interval);
 }, [fetchReplies, forceRefresh]);

 const handleRefresh = async () => {
 setIsRefreshing(true);
 await forceRefresh();
 setIsRefreshing(false);
 };

 // Filter and Search Logic
 const filteredReplies = useMemo(() => {
 let filtered = replies;

 if (filterType === "UNREAD") {
 filtered = filtered.filter((r) => !r.isRead);
 } else if (filterType === "SENT") {
 filtered = filtered.filter((r) => r.type === "SENT");
 } else if (filterType === "RECEIVED") {
 filtered = filtered.filter((r) => r.type !== "SENT");
 } else if (["INTERESTED", "NOT_INTERESTED", "OUT_OF_OFFICE", "SPAM", "OTHER"].includes(filterType)) {
 filtered = filtered.filter((r) => r.classification === filterType);
 }

 if (searchQuery.trim()) {
 const lowerQ = searchQuery.toLowerCase();
 filtered = filtered.filter(
 (r) =>
 r.subject?.toLowerCase().includes(lowerQ) ||
 r.fromEmail?.toLowerCase().includes(lowerQ) ||
 (r.recipient?.email || "").toLowerCase().includes(lowerQ) ||
 r.campaign?.name?.toLowerCase().includes(lowerQ),
 );
 }
 return filtered;
 }, [replies, filterType, searchQuery]);

 const totalPages = Math.ceil(filteredReplies.length / PAGE_SIZE) || 1;

 // Reset page if filtering reduces total pages
 useEffect(() => {
 if (currentPage > totalPages) setCurrentPage(1);
 }, [totalPages, currentPage]);

 const paginatedReplies = filteredReplies.slice(
 (currentPage - 1) * PAGE_SIZE,
 currentPage * PAGE_SIZE,
 );

 if (loading && replies.length === 0) return <PageSkeleton />;

 const stats = {
 total: replies.length,
 unread: replies.filter((r) => !r.isRead && r.type !== "SENT").length,
 received: replies.filter((r) => r.type !== "SENT").length,
 sent: replies.filter((r) => r.type === "SENT").length,
 };

 return (
 <div className="skeu-page">
 <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)] gap-4 text-text-primary overflow-hidden">
 {/* Title Header */}
 <div className="flex justify-between items-center shrink-0">
 <div>
 <h1 className="text-xl font-semibold font-display text-text-primary flex items-center gap-2">
 <Inbox size={20} className="text-primary-base" />
 Inbox
 </h1>
 <p className="text-sm text-text-muted mt-0.5">
 Manage and respond to prospect replies
 </p>
 </div>
 <button
 onClick={handleRefresh}
 disabled={isRefreshing}
 className="h-9 w-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-subtle shrink-0 transition-colors cursor-pointer disabled:opacity-50 border border-border-subtle bg-bg-base -sm"
 title="Refresh Inbox"
 >
 <RefreshCw
 size={16}
 className={isRefreshing ? "animate-spin text-primary-base" : ""}
 />
 </button>
 </div>

 {/* Stats Cards Row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
 <div
 onClick={() => setFilterType("ALL")}
 className={`skeu-stat-card cursor-pointer transition-all hover:border-primary-base/50 ${filterType === "ALL" ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle" : ""}`}
 >
 <div className="label">ALL EMAILS</div>
 <div className="value">{stats.total}</div>
 </div>
 <div
 onClick={() => setFilterType("UNREAD")}
 className={`skeu-stat-card cursor-pointer transition-all hover:border-primary-base/50 ${filterType === "UNREAD" ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle" : ""}`}
 >
 <div className="label flex items-center justify-center gap-1.5">
 UNREAD
 {stats.unread > 0 && (
 <span className="w-1.5 h-1.5 rounded-full bg-primary-base animate-pulse"></span>
 )}
 </div>
 <div className="value">{stats.unread}</div>
 </div>
 <div
 onClick={() => setFilterType("RECEIVED")}
 className={`skeu-stat-card cursor-pointer transition-all hover:border-primary-base/50 ${filterType === "RECEIVED" ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle" : ""}`}
 >
 <div className="label">RECEIVED</div>
 <div className="value">{stats.received}</div>
 </div>
 <div
 onClick={() => setFilterType("SENT")}
 className={`skeu-stat-card cursor-pointer transition-all hover:border-primary-base/50 ${filterType === "SENT" ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle" : ""}`}
 >
 <div className="label">SENT</div>
 <div className="value">{stats.sent}</div>
 </div>
 </div>

 {/* Inbox Main Card */}
 <div className="flex-1 flex flex-col min-h-0 bg-bg-base border border-border-subtle rounded-xl -sm overflow-hidden">
 {/* Search & Action Bar */}
 <div className="flex flex-col sm:flex-row items-center gap-3 p-3 border-b border-border-subtle bg-bg-subtle/30 shrink-0">
 <div className="relative flex-1 w-full">
 <Search
 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
 size={16}
 />
 <input
 placeholder="Search emails..."
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setCurrentPage(1);
 }}
 className="skeu-input pl-9 h-9 w-full rounded-full"
 />
 </div>
 <div className="flex items-center bg-bg-base border border-border-subtle rounded-full p-1 shadow-sm overflow-x-auto w-full sm:w-auto shrink-0 justify-center gap-1 scrollbar-hide">
 {(["ALL", "UNREAD", "RECEIVED", "SENT", "INTERESTED", "NOT_INTERESTED", "OUT_OF_OFFICE"].map((type) => (
 <button
 key={type}
 onClick={() => {
 setFilterType(type as "ALL" | "UNREAD" | "RECEIVED" | "SENT" | "INTERESTED" | "NOT_INTERESTED" | "OUT_OF_OFFICE");
 setCurrentPage(1);
 }}
 className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
 filterType === type
 ? "bg-primary-base text-primary-text"
 : "text-text-muted hover:bg-bg-subtle hover:text-text-primary"
 }`}
 >
 {type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
 </button>
 )))}
 </div>
 </div>

 {selectedIds.size > 0 && (
 <div className="bg-bg-subtle border-b border-border-subtle p-3 flex items-center gap-3">
 <span className="text-sm font-semibold text-text-primary ml-2">{selectedIds.size} selected</span>
 <div className="h-4 w-px bg-border-subtle mx-2" />
 <Button variant="outline" size="sm" onClick={() => handleBulkAction('mark_read')}>Mark Read</Button>
 <Button variant="outline" size="sm" onClick={() => handleBulkAction('mark_unread')}>Mark Unread</Button>
 <Button variant="outline" size="sm" onClick={() => handleBulkAction('flag')}>Flag</Button>
 </div>
 )}

 {/* List Container */}
 <div className="flex-1 overflow-auto bg-bg-base">
 {filteredReplies.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 min-h-[300px]">
 <div className="p-4 rounded-full bg-bg-subtle -inner animate-fade-in">
 <Inbox size={40} className="text-text-muted" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-text-primary">
 {searchQuery || filterType !== "ALL"
 ? "No matches found"
 : "You're all caught up!"}
 </h3>
 <p className="text-text-muted mt-1 max-w-sm text-sm">
 {searchQuery || filterType !== "ALL"
 ? "Try adjusting your filters or search query."
 : "New prospect replies will appear right here."}
 </p>
 </div>
 {(searchQuery || filterType !== "ALL") && (
 <button
 onClick={() => {
 setSearchQuery("");
 setFilterType("ALL");
 setCurrentPage(1);
 }}
 className="skeu-btn-ghost text-xs px-4 py-1.5 cursor-pointer"
 >
 Clear Filters
 </button>
 )}
 </div>
 ) : (
 <div className="flex flex-col divide-y divide-border-subtle">
 {paginatedReplies.map((reply) => {
 const isUnread = !reply.isRead && reply.type !== "SENT";
 const isSent = reply.type === "SENT";
 const nameOrEmail = isSent
 ? reply.recipient.email
 : reply.fromEmail;

 return (
 <div
 key={reply.id}
 className={`group flex items-center gap-3 px-4 py-3.5 transition-colors border-l-[3px] ${
 isUnread
 ? "bg-bg-base border-primary-base hover:bg-bg-subtle"
 : "bg-bg-subtle/20 border-transparent hover:bg-bg-subtle"
 }`}
 >
 <input 
 type="checkbox"
 className="cursor-pointer skeu-input w-4 h-4 rounded border-border-subtle"
 checked={selectedIds.has(reply.id)}
 onChange={(e) => {
 const newSet = new Set(selectedIds);
 if (e.target.checked) newSet.add(reply.id);
 else newSet.delete(reply.id);
 setSelectedIds(newSet);
 }}
 onClick={(e) => e.stopPropagation()}
 />
 {/* Unread dot */}
 <div className="w-2 flex justify-center shrink-0">
 {isUnread && (
 <span className="w-2 h-2 rounded-full bg-primary-base" />
 )}
 </div>

 {/* Sender Name / Address */}
 <div
 className={`w-36 sm:w-48 lg:w-56 flex-shrink-0 truncate text-sm flex items-center gap-1.5 cursor-pointer ${isUnread ? "font-bold text-text-primary" : "font-medium text-text-muted"}`}
 onClick={() => setSelectedReplyId(reply.id)}
 >
 <span className="truncate">
 {isSent ? `To: ${nameOrEmail}` : nameOrEmail}
 </span>
 {isSent && (
 <span className="skeu-badge skeu-badge-sent text-[9px] px-1 py-0.5 scale-90 shrink-0">
 Sent
 </span>
 )}
 </div>

 {/* Subject & Snippet & Campaign Badge */}
 <div className="flex-1 min-w-0 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" onClick={() => setSelectedReplyId(reply.id)}>
 <span
 className={`truncate shrink-0 ${isUnread ? "font-semibold text-text-primary" : "text-text-primary"}`}
 >
 {reply.subject || "(No Subject)"}
 </span>
 <span className="text-text-muted truncate hidden md:inline">
 - {reply.body.replace(/\n/g, " ")}
 </span>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 {reply.classification && (
 <span
 className={`skeu-badge text-[10px] py-0.5 px-2 font-medium border
 ${reply.classification === 'INTERESTED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
 reply.classification === 'NOT_INTERESTED' ? 'skeu-badge-failed' : 
 reply.classification === 'OUT_OF_OFFICE' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
 reply.classification === 'SPAM' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}
 >
 {reply.classification.replace(/_/g, ' ')}
 </span>
 )}
 {reply.campaign?.name && (
 <span
 className="skeu-badge bg-bg-subtle text-text-muted border-border-subtle max-w-[120px] truncate text-[10px] py-0.5 px-2 font-medium"
 title={`Campaign: ${reply.campaign.name}`}
 >
 {reply.campaign.name}
 </span>
 )}

 {/* Date */}
 <div
 className={`text-xs whitespace-nowrap text-right ${isUnread ? "font-bold text-primary-base" : "font-medium text-text-muted"}`}
 >
 {new Date(reply.receivedAt).toLocaleDateString(
 undefined,
 { month: "short", day: "numeric" },
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Pagination Footer */}
 {totalPages > 1 && (
 <div className="flex justify-between items-center px-4 py-3 border-t border-border-subtle bg-bg-subtle/30 shrink-0">
 <span className="text-xs text-text-muted font-medium">
 Showing {(currentPage - 1) * PAGE_SIZE + 1}-
 {Math.min(currentPage * PAGE_SIZE, filteredReplies.length)} of{" "}
 {filteredReplies.length}
 <span className="mx-2 text-border-subtle">|</span>
 Page {currentPage} of {totalPages}
 </span>
 <div className="flex gap-1">
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:bg-bg-base hover:text-text-primary border border-border-subtle disabled:opacity-50 cursor-pointer transition-colors bg-bg-base"
 >
 <ChevronLeft size={14} />
 </button>
 <button
 onClick={() =>
 setCurrentPage((p) => Math.min(totalPages, p + 1))
 }
 disabled={currentPage === totalPages}
 className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:bg-bg-base hover:text-text-primary border border-border-subtle disabled:opacity-50 cursor-pointer transition-colors bg-bg-base"
 >
 <ChevronRight size={14} />
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Shadcn Drawer for Email Viewing */}
 <Drawer
 direction="right"
 open={!!selectedReplyId}
 onOpenChange={(open) => !open && setSelectedReplyId(null)}
 >
 <EmailDetailDrawer
 replyId={selectedReplyId}
 onClose={() => setSelectedReplyId(null)}
 />
 </Drawer>
 </div>
 </div>
 );
}
