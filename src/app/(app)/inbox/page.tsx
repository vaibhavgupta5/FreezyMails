"use client";

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import {
  Inbox,
  RefreshCw,
  Search,
  CheckCircle2,
  Mail,
  MailCheck,
  Send,
  AlertCircle,
  Flag,
  X,
} from "lucide-react";
import InboxSkeleton from "./_components/InboxSkeleton";
import { useInboxStore } from "@/stores/useInboxStore";
import {
  useInboxReplies,
  useSyncImapMutation,
  useBulkActionMutation,
  type InboxReply,
} from "@/hooks/useInboxQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Drawer } from "@/components/ui/drawer";
import EmailDetailDrawer from "./_components/EmailDetailDrawer";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const PAGE_SIZE = 25;

const InboxRow = memo(function InboxRow({
  reply,
  isSelected,
  onSelect,
  onOpen,
}: {
  reply: InboxReply;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onOpen: (reply: InboxReply) => void;
}) {
  const isUnread = !reply.isRead && reply.type !== "SENT";
  const isSent = reply.type === "SENT";
  const nameOrEmail = isSent ? reply.recipient?.email : reply.fromEmail;

  const cleanPreview = reply.body
    ? reply.body
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  return (
    <tr
      onClick={() => onOpen(reply)}
      className={`hover:bg-bg-subtle transition-colors cursor-pointer border-l-2 ${
        isUnread
          ? "bg-bg-base border-l-primary-base font-medium"
          : "bg-bg-subtle/20 border-l-transparent"
      }`}
    >
      <td className="px-3 sm:px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="cursor-pointer skeu-input w-4 h-4 rounded border-border-subtle"
          checked={isSelected}
          onChange={(e) => onSelect(reply.id, e.target.checked)}
        />
      </td>
      <td className="px-3 sm:px-4 py-3 font-medium text-text-primary max-w-[120px] sm:max-w-[200px] truncate">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary-base shrink-0" />
          )}
          <span className="truncate">
            {isSent ? `To: ${nameOrEmail}` : nameOrEmail}
          </span>
          {isSent && (
            <span className="skeu-badge skeu-badge-sent text-[9px] px-1.5 py-0.5 shrink-0">
              Sent
            </span>
          )}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 text-text-primary max-w-[160px] sm:max-w-[350px] truncate">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          {reply.isFlagged && (
            <span
              className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 shadow-2xs"
              title="Follow-up flagged"
            >
              <Flag size={10} className="fill-amber-500 text-amber-500" />
              Follow-up
            </span>
          )}
          <span
            className={`truncate ${
              isUnread ? "font-semibold text-text-primary" : "text-text-primary"
            }`}
          >
            {reply.subject || "(No Subject)"}
          </span>
          <span className="text-text-muted truncate hidden sm:inline text-xs opacity-75">
            - {cleanPreview}
          </span>
        </div>
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-text-muted max-w-[140px] truncate">
        {reply.campaign?.name || "Manual Send"}
      </td>
      <td className="px-3 sm:px-4 py-3 text-text-muted text-right font-mono text-[11px] sm:text-xs">
        {new Date(reply.receivedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
    </tr>
  );
});

export default function InboxPage() {
  const searchParams = useSearchParams();
  const searchQuery = useInboxStore((s) => s.searchQuery);
  const setSearchQuery = useInboxStore((s) => s.setSearchQuery);
  const filterType = useInboxStore((s) => s.filterType);
  const setFilterType = useInboxStore((s) => s.setFilterType);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  const filterParam = searchParams.get("filter");
  const searchParam = searchParams.get("search");

  const [prevParams, setPrevParams] = useState<{
    filter: string | null;
    search: string | null;
  }>({
    filter: null,
    search: null,
  });

  if (
    (filterParam !== null && prevParams.filter !== filterParam) ||
    (searchParam !== null && prevParams.search !== searchParam)
  ) {
    setPrevParams({ filter: filterParam, search: searchParam });
    if (filterParam) {
      setFilterType(
        filterParam.toUpperCase() as
          | "ALL"
          | "UNREAD"
          | "SENT"
          | "RECEIVED"
          | "FOLLOW_UP"
      );
    }
    if (searchParam) {
      setLocalSearch(searchParam);
      setDebouncedSearch(searchParam);
      setSearchQuery(searchParam);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
      setSearchQuery(localSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReply, setSelectedReply] = useState<InboxReply | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useInboxReplies({
    filterType,
    searchQuery: debouncedSearch,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const syncMutation = useSyncImapMutation();
  const bulkMutation = useBulkActionMutation();

  const replies = useMemo(() => data?.replies ?? [], [data?.replies]);
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const stats = data?.stats ?? {
    total,
    unread: unreadCount,
    received: 0,
    sent: 0,
  };

  useEffect(() => {
    if (data?.unreadCount !== undefined) {
      useInboxStore.setState({ unreadCount: data.unreadCount });
    }
  }, [data?.unreadCount]);

  const allFilteredSelected = useMemo(
    () => replies.length > 0 && replies.every((r) => selectedIds.has(r.id)),
    [replies, selectedIds],
  );

  const handleBulkAction = useCallback(
    async (action: string) => {
      try {
        await bulkMutation.mutateAsync({
          ids: Array.from(selectedIds),
          action,
        });
        toast.success("Action applied");
        setSelectedIds(new Set());
      } catch (_err: unknown) {
        const err = _err as Error;
        toast.error(err.message || "Bulk action failed");
      }
    },
    [bulkMutation, selectedIds],
  );

  const handleRefresh = useCallback(async () => {
    try {
      await syncMutation.mutateAsync();
      toast.success("Inbox synced");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Sync failed";
      toast.error(errMsg);
    }
  }, [syncMutation]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
    },
    [totalPages],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const nextSet = new Set(prev);
      if (replies.every((r) => nextSet.has(r.id))) {
        replies.forEach((r) => nextSet.delete(r.id));
      } else {
        replies.forEach((r) => nextSet.add(r.id));
      }
      return nextSet;
    });
  }, [replies]);

  const handleRowSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleRowOpen = useCallback((reply: InboxReply) => {
    setSelectedReply(reply);
  }, []);

  if (isLoading && !data) return <InboxSkeleton />;

  return (
    <div className="skeu-page h-[100dvh] overflow-y-auto w-full flex flex-col">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Inbox size={22} className="text-primary-base" />
              Inbox
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Manage and respond to prospect replies in real-time.
            </p>
          </div>
          <Button
            variant="outline"
            className="skeu-btn border-border-subtle text-text-muted w-full sm:w-auto"
            onClick={handleRefresh}
            disabled={syncMutation.isPending || isFetching}
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${
                syncMutation.isPending || isFetching
                  ? "animate-spin text-primary-base"
                  : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
          <Card
            onClick={() => {
              setFilterType("ALL");
              setCurrentPage(1);
            }}
            className={`skeu-card p-3 sm:p-4 cursor-pointer transition-all hover:border-primary-base/50 flex flex-col justify-between ${
              filterType === "ALL"
                ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle/80"
                : ""
            }`}
          >
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest text-text-muted uppercase flex items-center justify-between">
              <span>All Emails</span>
              <Mail size={16} className="text-text-muted opacity-80 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1.5 sm:mt-2">
              {stats.total}
            </div>
          </Card>

          <Card
            onClick={() => {
              setFilterType("UNREAD");
              setCurrentPage(1);
            }}
            className={`skeu-card p-3 sm:p-4 cursor-pointer transition-all hover:border-primary-base/50 flex flex-col justify-between ${
              filterType === "UNREAD"
                ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle/80"
                : ""
            }`}
          >
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest text-text-muted uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">Unread</span>
              <AlertCircle size={16} className="text-primary-base shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1.5 sm:mt-2">
              {stats.unread}
            </div>
          </Card>

          <Card
            onClick={() => {
              setFilterType("RECEIVED");
              setCurrentPage(1);
            }}
            className={`skeu-card p-3 sm:p-4 cursor-pointer transition-all hover:border-primary-base/50 flex flex-col justify-between ${
              filterType === "RECEIVED"
                ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle/80"
                : ""
            }`}
          >
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest text-text-muted uppercase flex items-center justify-between">
              <span>Received</span>
              <MailCheck
                size={16}
                className="text-text-muted opacity-80 shrink-0"
              />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1.5 sm:mt-2">
              {stats.received}
            </div>
          </Card>

          <Card
            onClick={() => {
              setFilterType("SENT");
              setCurrentPage(1);
            }}
            className={`skeu-card p-3 sm:p-4 cursor-pointer transition-all hover:border-primary-base/50 flex flex-col justify-between ${
              filterType === "SENT"
                ? "border-primary-base ring-1 ring-primary-base bg-bg-subtle/80"
                : ""
            }`}
          >
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest text-text-muted uppercase flex items-center justify-between">
              <span>Sent</span>
              <Send size={16} className="text-text-muted opacity-80 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-text-primary mt-1.5 sm:mt-2">
              {stats.sent}
            </div>
          </Card>
        </div>

        {/* Controls Row: Search & Classification Filter Pills */}
        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 lg:items-center shrink-0">
          <div className="relative w-full lg:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <Input
              placeholder="Search email, subject, or campaign..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="skeu-input pl-9 pr-8 w-full"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  setDebouncedSearch("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center bg-bg-subtle/50 border border-border-subtle rounded-lg p-1 overflow-x-auto w-full lg:w-auto shrink-0 gap-1 scrollbar-hide">
            {["ALL", "UNREAD", "RECEIVED", "SENT", "FOLLOW_UP"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(
                    type as
                      | "ALL"
                      | "UNREAD"
                      | "RECEIVED"
                      | "SENT"
                      | "FOLLOW_UP",
                  );
                  setCurrentPage(1);
                }}
                className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  filterType === type
                    ? "bg-primary-base text-primary-text shadow-sm"
                    : "text-text-muted hover:bg-bg-subtle hover:text-text-primary"
                }`}
              >
                {type
                  .split("_")
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(" ")}
              </button>
            ))}
          </div>

          <div className="text-xs text-text-muted shrink-0 lg:ml-auto">
            Showing {replies.length} of {total} items
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-bg-subtle border border-border-subtle rounded-lg p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary-base" />
              <span className="text-xs sm:text-sm font-semibold text-text-primary">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="skeu-btn text-xs h-8"
                onClick={() => handleBulkAction("mark_read")}
                disabled={bulkMutation.isPending}
              >
                Mark Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="skeu-btn text-xs h-8"
                onClick={() => handleBulkAction("mark_unread")}
                disabled={bulkMutation.isPending}
              >
                Mark Unread
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="skeu-btn text-xs h-8 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5"
                onClick={() => handleBulkAction("flag")}
                disabled={bulkMutation.isPending}
              >
                <Flag size={12} className="fill-amber-500 text-amber-500" />
                Flag Follow-Up
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-text-muted hover:text-text-primary"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="skeu-card -skeu-base overflow-hidden flex-1 flex flex-col min-h-[350px]">
          <div className="overflow-y-auto overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px] md:min-w-[750px]">
              <thead className="bg-bg-subtle text-text-muted sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-3 font-medium border-b border-border-subtle w-8 sm:w-10">
                    <input
                      type="checkbox"
                      className="cursor-pointer skeu-input w-4 h-4 rounded border-border-subtle"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 sm:px-4 py-3 font-medium border-b border-border-subtle w-1/3 sm:w-1/4">
                    Sender / Recipient
                  </th>
                  <th className="px-3 sm:px-4 py-3 font-medium border-b border-border-subtle flex-1">
                    Subject & Preview
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium border-b border-border-subtle">
                    Campaign
                  </th>
                  <th className="px-3 sm:px-4 py-3 font-medium border-b border-border-subtle text-right">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading || isFetching ? (
                  [...Array(6)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-3 sm:px-4 py-3.5">
                        <Skeleton className="h-4 w-4 rounded" />
                      </td>
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-28 sm:w-32" />
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-36 sm:w-48" />
                          <Skeleton className="h-3 w-24 hidden sm:inline" />
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3.5">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </td>
                      <td className="px-3 sm:px-4 py-3.5 text-right">
                        <Skeleton className="h-3 w-12 sm:w-14 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : replies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-16 text-center text-text-muted"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 rounded-full bg-bg-subtle">
                          <Inbox size={32} className="text-text-muted" />
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">
                            {searchQuery || filterType !== "ALL"
                              ? "No matching emails found"
                              : "No emails in inbox"}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            {searchQuery || filterType !== "ALL"
                              ? "Try resetting your search or filters."
                              : "Incoming prospect replies will automatically appear here."}
                          </p>
                        </div>
                        {(searchQuery || filterType !== "ALL") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLocalSearch("");
                              setDebouncedSearch("");
                              setSearchQuery("");
                              setFilterType("ALL");
                              setCurrentPage(1);
                            }}
                            className="skeu-btn text-xs mt-2"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  replies.map((reply) => (
                    <InboxRow
                      key={reply.id}
                      reply={reply}
                      isSelected={selectedIds.has(reply.id)}
                      onSelect={handleRowSelect}
                      onOpen={handleRowOpen}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div className="pt-2 pb-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                <PaginationItem>
                  <div className="text-xs sm:text-sm font-medium px-2 sm:px-4 text-text-primary">
                    Page {currentPage} of {totalPages}
                  </div>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Drawer for Email Detail Viewing */}
        <Drawer
          direction="right"
          open={!!selectedReply}
          onOpenChange={(open) => !open && setSelectedReply(null)}
        >
          <EmailDetailDrawer
            reply={selectedReply}
            onClose={() => setSelectedReply(null)}
          />
        </Drawer>
      </div>
    </div>
  );
}
