"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useInboxStore } from "@/stores/useInboxStore";
import {
  useToggleFlagMutation,
  useMarkAsReadMutation,
} from "@/hooks/useInboxQuery";
import { DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { renderTemplate } from "@/lib/template-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send,
  Sparkles,
  X,
  Copy,
  Flag,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Paperclip,
} from "lucide-react";

import type { InboxReply } from "@/hooks/useInboxQuery";

// Snippets
const SNIPPETS = [
  "Thanks for getting back to me. I'd love to schedule a quick call to discuss further.",
  "Understood, thanks for letting me know. I won't reach out again.",
  "Happy to send over more details. What specifically are you looking for?",
];

export default function EmailDetailDrawer({
  reply: propReply,
  replyId,
  onClose,
}: {
  reply?: InboxReply | null;
  replyId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const updateReply = useInboxStore((s) => s.updateReply);
  const toggleFlagMutation = useToggleFlagMutation();
  const markAsReadMutation = useMarkAsReadMutation();

  const activeId = propReply?.id || replyId;
  const storeReply = useInboxStore((s) =>
    activeId ? s.replies.find((r) => r.id === activeId) : null
  );
  const reply = (propReply || storeReply || null) as InboxReply | null;

  const currentReplyId = reply?.id ?? null;
  const [prevReplyId, setPrevReplyId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseSubject, setResponseSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showSendAgainConfirm, setShowSendAgainConfirm] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiChips, setAiChips] = useState<string[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<
    { filename: string; content: string; size?: string }[]
  >([]);
  const [optimisticState, setOptimisticState] = useState<{ id: string; isFlagged: boolean } | null>(null);

  if (currentReplyId !== prevReplyId) {
    setPrevReplyId(currentReplyId);
    if (reply) {
      setResponseSubject(
        reply.subject?.startsWith("Re:")
          ? reply.subject
          : `Re: ${reply.subject || ""}`
      );
      setResponseText("");
      setReplyAttachments([]);
      setAiChips([]);
    }
  }

  const currentIsFlagged =
    optimisticState?.id === reply?.id ? optimisticState?.isFlagged : !!reply?.isFlagged;

  const handleToggleFlag = useCallback(() => {
    if (!reply) return;
    const nextFlag = !currentIsFlagged;
    setOptimisticState({ id: reply.id, isFlagged: nextFlag });
    toggleFlagMutation.mutate(
      { id: reply.id, isFlagged: nextFlag },
      {
        onError: () => {
          setOptimisticState(null);
          toast.error("Failed to update follow-up status");
        },
      }
    );
  }, [reply, currentIsFlagged, toggleFlagMutation]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cached Templates fetch via TanStack Query
  const { data: templatesData } = useQuery<
    { id: string; name: string; subject: string; body: string }[]
  >({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
    enabled: !!activeId,
  });
  const templates = templatesData || [];

  // Optimized Memoized Thread, HTML, URL, and Attachment Calculations
  const { mainBody, quotedThread, isHtmlBody, links, rawAttachments } =
    useMemo(() => {
      if (!reply) {
        return {
          mainBody: "",
          quotedThread: "",
          isHtmlBody: false,
          links: [],
          rawAttachments: [],
        };
      }

      const bodyText = reply.body || "";
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linksArr = Array.from(new Set(bodyText.match(urlRegex) || []));

      const bodyLines = bodyText.split("\n");
      const newLines = [];
      const threadLines = [];
      let inThread = false;

      for (const line of bodyLines) {
        if (
          line.trim().startsWith(">") ||
          /On .* wrote:/.test(line) ||
          /From: /.test(line) ||
          /___/.test(line)
        ) {
          inThread = true;
        }
        if (inThread) {
          threadLines.push(line);
        } else {
          newLines.push(line);
        }
      }

      const mBody = newLines.join("\n").trim();
      const qThread = threadLines.join("\n").trim();
      const htmlFlag = /<[a-z][\s\S]*>/i.test(mBody || bodyText);

      const replyObj = reply as unknown as Record<string, unknown>;
      const atts = (replyObj.attachments ||
        (replyObj.metadata as Record<string, unknown>)?.attachments ||
        (
          (replyObj.campaign as Record<string, unknown>)?.template as Record<
            string,
            unknown
          >
        )?.attachments ||
        []) as {
        filename?: string;
        name?: string;
        url?: string;
        size?: string | number;
      }[];

      return {
        mainBody: mBody,
        quotedThread: qThread,
        isHtmlBody: htmlFlag,
        links: linksArr,
        rawAttachments: atts,
      };
    }, [reply]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Content = result.split(",")[1] || result;
        setReplyAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Content,
            size: `${(file.size / 1024).toFixed(1)} KB`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }, []);

  const onSend = useCallback(async () => {
    if (!reply) return;
    setSending(true);
    try {
      const res = await fetch(`/api/replies/${reply.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: responseText,
          subject: responseSubject,
          attachments: replyAttachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        }),
      });
      if (!res.ok) {
        let errStr = "Failed to send";
        try {
          const errData = await res.json();
          if (errData.error) errStr = errData.error;
        } catch {
          // Ignore parsing error
        }
        throw new Error(errStr);
      }
      const updated = await res.json();
      toast.success("Reply sent successfully");
      updateReply(reply.id, updated);
      setResponseText("");
      setReplyAttachments([]);
      setShowSendAgainConfirm(false);
      onClose();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to send reply";
      if (
        errMsg.includes("has disconnected") ||
        errMsg.includes("No active email account")
      ) {
        toast.error(errMsg, {
          action: {
            label: "Go to Accounts",
            onClick: () => router.push("/accounts"),
          },
          duration: 10000,
        });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setSending(false);
    }
  }, [reply, responseText, responseSubject, replyAttachments, updateReply, onClose, router]);

  const handleSuggestReply = useCallback(async () => {
    if (!reply) return;
    setAiGenerating(true);
    setAiChips([]);
    try {
      const cleanBody = reply.body
        ? reply.body.replace(/<[^>]*>/g, " ").trim()
        : "";
      const res = await fetch("/api/gemini/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalEmail: `Subject: ${reply.subject || ""}`,
          replyReceived: cleanBody,
          instruction:
            "Provide exactly 3 distinct one-sentence reply suggestions separated by the pipe character |. Do not include quotes or numbering.",
        }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();
      const rawText = data.reply || "";
      const chips = rawText
        .split(/[\n|]+/)
        .map((s: string) =>
          s.replace(/^[\d\s.\-*"]+/, "").replace(/"$/, "").trim()
        )
        .filter((s: string) => s.length > 0 && s.length < 180);

      if (chips.length > 0) {
        setAiChips(chips.slice(0, 4));
        toast.success("Generated AI suggestions!");
      } else {
        setResponseText(rawText);
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message || "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  }, [reply]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!replyId || !reply) return;
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (responseText.trim() && !sending) {
          if (reply.repliedAt && !showSendAgainConfirm) {
            setShowSendAgainConfirm(true);
          } else {
            onSend();
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        handleSuggestReply();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [replyId, reply, responseText, sending, showSendAgainConfirm, onClose, onSend, handleSuggestReply]);

  // Mark as read when drawer opens using TanStack mutation
  useEffect(() => {
    if (reply && !reply.isRead && reply.type !== "SENT") {
      markAsReadMutation.mutate(reply.id);
    }
  }, [reply, markAsReadMutation]);

  if (replyId && !reply) {
    return (
      <DrawerContent className="inset-y-0 right-0 left-auto top-0 bottom-0 mt-0 w-full sm:w-[600px] lg:w-[800px] h-full rounded-none outline-none flex flex-col bg-bg-base border-l border-t-0 border-border-subtle text-text-primary p-6">
        <div className="flex justify-between items-center mb-8 mt-12">
          <Skeleton className="h-8 w-2/3" />
        </div>
        <div className="flex items-center gap-4 mb-8 border-b border-border-subtle pb-6">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </DrawerContent>
    );
  }

  if (!reply) {
    return null;
  }

  const isSent = reply.type === "SENT";

  // Stats from mailEvents
  const mailEvents = reply.recipient?.mailEvents || [];
  const opens = mailEvents.filter(
    (e: { type: string }) => e.type === "OPENED"
  ).length;
  const clicks = mailEvents.filter(
    (e: { type: string }) => e.type === "CLICKED"
  ).length;

  const handleCopyDraft = () => {
    if (!responseText) return;
    navigator.clipboard.writeText(responseText);
    toast.success("Draft copied to clipboard!");
  };

  return (
    <DrawerContent className="inset-y-0 right-0 left-auto top-0 bottom-0 mt-0 w-full sm:w-[600px] lg:w-[750px] xl:w-[850px] max-w-full h-full rounded-none outline-none flex flex-col bg-bg-base border-l border-t-0 border-border-subtle text-text-primary z-50 overflow-hidden shadow-2xl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-bg-base/95 backdrop-blur-md border-b border-border-subtle px-4 py-4 sm:px-6 lg:px-8 sm:py-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2 flex-wrap leading-snug">
            <span className="break-words">{reply.subject || "(No Subject)"}</span>
            {reply.repliedAt && (
              <span className="skeu-badge skeu-badge-replied text-xs py-0.5 px-2 shrink-0 font-medium">
                Replied
              </span>
            )}
          </h2>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFlag}
            className={`skeu-btn text-xs h-8 gap-1.5 transition-all border px-2.5 sm:px-3 ${
              currentIsFlagged
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 font-medium shadow-xs hover:bg-amber-500/25"
                : "text-text-muted hover:text-text-primary border-border-subtle bg-bg-base"
            }`}
            title={
              currentIsFlagged
                ? "Click to unmark follow-up flag"
                : "Mark as follow-up"
            }
          >
            <Flag
              size={13}
              className={currentIsFlagged ? "fill-amber-500 text-amber-500" : ""}
            />
            <span className="hidden sm:inline">
              {currentIsFlagged ? "Flagged (Unmark)" : "Follow-Up"}
            </span>
          </Button>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer border border-border-subtle bg-bg-base shrink-0"
            title="Close Drawer (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Drawer Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Quick Profile & Info Card */}
        <div className="bg-bg-subtle/40 border border-border-subtle rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-base/10 text-primary-base border border-primary-base/20 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                {isSent
                  ? (reply.recipient?.email?.[0] || "U").toUpperCase()
                  : (reply.fromEmail?.[0] || "U").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary text-sm truncate">
                  {isSent ? `To: ${reply.recipient?.email}` : reply.fromEmail}
                </div>
                <div className="text-xs text-text-muted truncate">
                  Campaign:{" "}
                  <span className="text-text-primary font-medium">
                    {reply.campaign?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-text-muted shrink-0">
              <div className="text-xs text-text-muted whitespace-nowrap">
                {new Date(reply.receivedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {isSent && (opens > 0 || clicks > 0) && (
            <div className="flex items-center gap-4 pt-3 border-t border-border-subtle/60">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-text-muted">Opens:</span>
                <span className="font-semibold text-text-primary">{opens}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span className="text-text-muted">Clicks:</span>
                <span className="font-semibold text-text-primary">{clicks}</span>
              </div>
            </div>
          )}
        </div>

        {/* Email Body Card */}
        <div className="bg-bg-base border border-border-subtle rounded-xl p-5 space-y-4">
          <div className="min-h-[100px]">
            {isHtmlBody ? (
              <div
                className="text-text-primary leading-relaxed text-sm overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: mainBody || reply.body }}
              />
            ) : (
              <div className="text-text-primary whitespace-pre-wrap leading-relaxed text-sm font-sans">
                {mainBody || reply.body}
              </div>
            )}

            {quotedThread && (
              <div className="mt-4 pt-3 border-t border-border-subtle/50">
                <button
                  onClick={() => setShowThread(!showThread)}
                  className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 font-medium transition-colors"
                >
                  <div className="w-6 border-b border-border-subtle inline-block mr-1"></div>
                  ••• {showThread ? "Hide" : "Show"} previous messages
                </button>
                {showThread && (
                  <div className="mt-3 pl-3 border-l-2 border-primary-base/30 text-text-muted text-xs sm:text-sm whitespace-pre-wrap opacity-85">
                    {quotedThread}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Attachments Display */}
          {rawAttachments.length > 0 && (
            <div className="pt-4 border-t border-border-subtle space-y-2">
              <div className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Paperclip size={14} className="text-text-secondary" />
                Attachments ({rawAttachments.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {rawAttachments.map((att, idx) => {
                  const fname = att.filename || att.name || `Attachment-${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs bg-bg-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-text-primary"
                    >
                      <Paperclip size={14} className="text-primary-base shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">
                        {fname}
                      </span>
                      {att.size && (
                        <span className="text-[10px] text-text-muted">
                          ({att.size})
                        </span>
                      )}
                      {att.url && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-base hover:underline text-[11px] font-medium ml-1 flex items-center gap-0.5"
                        >
                          Download <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* URL Link Preview Strip */}
          {links.length > 0 && (
            <div className="pt-3 border-t border-border-subtle">
              <div className="text-[11px] font-semibold text-text-muted mb-2">Links in message</div>
              <div className="flex flex-wrap gap-2">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-bg-subtle border border-border-subtle px-2.5 py-1.5 rounded-lg hover:bg-bg-subtle/80 hover:border-primary-base/30 transition-all max-w-[280px]"
                  >
                    <ExternalLink size={12} className="shrink-0 text-primary-base" />
                    <span className="truncate text-text-secondary">
                      {link.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reply Composer Section */}
        <div className="bg-bg-base border border-border-subtle rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-subtle/60">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Send size={15} className="text-primary-base" />
              Reply to Prospect
            </h3>
            <div className="flex items-center gap-2">
              {/* Templates Dropdown */}
              <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-text-muted hover:text-text-primary bg-bg-subtle border border-border-subtle"
                  >
                    <MessageSquare size={12} className="mr-1" />
                    Templates
                    <ChevronDown size={12} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[280px] p-1">
                  {templates.length === 0 ? (
                    <div className="p-3 text-xs text-text-muted text-center">
                      No saved templates
                    </div>
                  ) : (
                    templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        className="w-full text-xs text-left px-3 py-2 hover:bg-bg-subtle text-text-primary transition-colors rounded-sm truncate"
                        onClick={() => {
                          const dynamicData: Record<string, string> = {
                            firstName:
                              reply?.recipient?.email
                                ?.split("@")[0]
                                ?.split(".")[0] || "",
                            email: reply?.recipient?.email || "",
                          };
                          if (reply?.recipient?.dynamicData) {
                            for (const [k, v] of Object.entries(
                              reply.recipient.dynamicData
                            )) {
                              dynamicData[k] = String(v);
                            }
                          }
                          setResponseSubject(
                            renderTemplate(tpl.subject as string, dynamicData)
                          );
                          setResponseText(
                            renderTemplate(tpl.body as string, dynamicData)
                          );
                          setTemplatesOpen(false);
                          textareaRef.current?.focus();
                        }}
                      >
                        {tpl.name}
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>

              {/* Snippets Dropdown */}
              <Popover open={snippetsOpen} onOpenChange={setSnippetsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-text-muted hover:text-text-primary bg-bg-subtle border border-border-subtle"
                  >
                    <MessageSquare size={12} className="mr-1" />
                    Snippets
                    <ChevronDown size={12} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[300px] p-1">
                  {SNIPPETS.map((snippet, idx) => (
                    <button
                      key={idx}
                      className="w-full text-xs text-left px-3 py-2 hover:bg-bg-subtle text-text-secondary transition-colors rounded-sm"
                      onClick={() => {
                        setResponseText((prev) =>
                          prev ? `${prev}\n\n${snippet}` : snippet
                        );
                        setSnippetsOpen(false);
                        textareaRef.current?.focus();
                      }}
                    >
                      {snippet}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* AI Chips */}
          {aiChips.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-primary-base/5 border border-primary-base/20 rounded-lg">
              <div className="w-full text-[11px] font-medium text-primary-base flex items-center gap-1 mb-1">
                <Sparkles size={12} /> Click a suggestion to insert:
              </div>
              {aiChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setResponseText((prev) =>
                      prev ? `${prev} ${chip}` : chip
                    );
                    setAiChips((prev) => prev.filter((_, i) => i !== idx));
                    textareaRef.current?.focus();
                  }}
                  className="text-xs bg-bg-base hover:bg-primary-base/10 text-text-primary hover:text-primary-base border border-primary-base/20 px-3 py-1.5 rounded-lg transition-colors text-left font-normal"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <Input
              type="text"
              className="skeu-input w-full font-medium text-sm"
              value={responseSubject}
              onChange={(e) => setResponseSubject(e.target.value)}
              placeholder="Subject..."
            />
            <Textarea
              ref={textareaRef}
              className="skeu-textarea w-full text-sm min-h-[120px]"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your reply to this prospect... (Cmd+Enter to send)"
              rows={5}
            />
          </div>

          {/* Attached Files List for Reply */}
          {replyAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {replyAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-xs bg-bg-subtle border border-border-subtle px-2.5 py-1 rounded-md text-text-primary"
                >
                  <Paperclip size={12} className="text-primary-base" />
                  <span className="truncate max-w-[160px]">
                    {att.filename}
                  </span>
                  {att.size && (
                    <span className="text-[10px] text-text-muted">
                      ({att.size})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setReplyAttachments((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-text-muted hover:text-text-primary ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle/60">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestReply}
                disabled={aiGenerating}
                className="h-8 text-xs gap-1.5 text-primary-base hover:text-primary-base hover:bg-primary-base/10"
                title="Generate starters (Cmd+G)"
              >
                <Sparkles size={14} className={aiGenerating ? "animate-spin" : ""} />
                {aiGenerating ? "Generating..." : "AI Suggestions"}
              </Button>

              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="h-8 px-2.5 flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary bg-bg-subtle border border-border-subtle rounded-md transition-colors">
                  <Paperclip size={14} />
                  <span>Attach</span>
                </div>
              </label>

              {responseText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="h-8 text-xs px-2 text-text-muted hover:text-text-primary"
                  title="Copy draft"
                >
                  <Copy size={14} />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showSendAgainConfirm ? (
                <div className="flex items-center gap-2 animate-fade-in bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Send another message?
                  </span>
                  <button
                    onClick={() => setShowSendAgainConfirm(false)}
                    className="text-xs text-text-muted hover:text-text-primary px-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSend}
                    disabled={sending}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Confirm
                  </button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (reply.repliedAt) setShowSendAgainConfirm(true);
                    else onSend();
                  }}
                  disabled={!responseText.trim() || sending}
                  isLoading={sending}
                  className="h-9 font-medium px-4 gap-2"
                >
                  {!sending && <Send size={15} />}
                  {sending
                    ? "Sending..."
                    : reply.repliedAt
                      ? "Send Again"
                      : "Send Reply"}
                </Button>
              )}
            </div>
          </div>
          <div className="text-right text-[10px] text-text-muted opacity-60">
            Ctrl/Cmd+Enter to send • Esc to close • Ctrl/Cmd+G for AI
          </div>
        </div>
      </div>
    </DrawerContent>
  );
}
