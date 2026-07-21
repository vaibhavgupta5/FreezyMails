"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInboxStore } from "@/stores/useInboxStore";
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
} from "lucide-react";

// Snippets
const SNIPPETS = [
  "Thanks for getting back to me. I'd love to schedule a quick call to discuss further.",
  "Understood, thanks for letting me know. I won't reach out again.",
  "Happy to send over more details. What specifically are you looking for?",
];

export default function EmailDetailDrawer({
  replyId,
  onClose,
}: {
  replyId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { replies, markAsRead, updateReply, toggleFlag } = useInboxStore();

  const reply = replies.find((r) => r.id === replyId);

  const [responseText, setResponseText] = useState("");
  const [responseSubject, setResponseSubject] = useState("");
  const [prevReplyId, setPrevReplyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showSendAgainConfirm, setShowSendAgainConfirm] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; subject: string; body: string; [key: string]: unknown }[]
  >([]);
  const [aiChips, setAiChips] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (reply?.id !== prevReplyId) {
    setPrevReplyId(reply?.id || null);
    if (reply) {
      setResponseSubject(
        reply.subject?.startsWith("Re:")
          ? reply.subject
          : `Re: ${reply.subject || ""}`,
      );
      setResponseText("");
    }
  }

  // Fetch templates and initialize subject
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data || []))
      .catch(console.error);
  }, []);

  const onSend = async () => {
    if (!reply) return;
    setSending(true);
    try {
      const res = await fetch(`/api/replies/${reply.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: responseText, subject: responseSubject }),
      });
      if (!res.ok) {
        let errStr = "Failed to send";
        try {
          const errData = await res.json();
          if (errData.error) errStr = errData.error;
        } catch (_) {}
        throw new Error(errStr);
      }
      const updated = await res.json();
      toast.success("Reply sent successfully");
      updateReply(reply.id, updated);
      setResponseText("");
      setShowSendAgainConfirm(false);
      onClose(); // close drawer after sending
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
  };

  const handleSuggestReply = async () => {
    if (!reply || reply.type === "SENT") return;
    setAiGenerating(true);
    setAiChips([]); // clear previous chips
    try {
      const res = await fetch("/api/gemini/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalEmail: `Outbound Campaign: ${reply?.campaign?.name || "Cold Outreach"}\nSubject: ${reply?.subject || ""}`,
          replyReceived: reply?.body || "",
          instruction:
            'Provide exactly 3 short, one-sentence reply starters separated by the pipe character "|". Do not include any quotes or other text.',
        }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();

      const chips = data.reply
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (chips.length > 0) {
        setAiChips(chips);
        toast.success("Generated AI suggestions!");
      } else {
        setResponseText(data.reply);
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

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
  }, [replyId, reply, responseText, sending, showSendAgainConfirm]);

  // Mark as read when viewing
  useEffect(() => {
    if (reply && !reply.isRead && reply.type !== "SENT") {
      markAsRead(reply.id);
      fetch(`/api/replies/${reply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      }).catch(console.error);
    }
  }, [reply, markAsRead]);

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

  if (!replyId || !reply) {
    return null; // Drawer will close since open={!!selectedReplyId}
  }

  const isSent = reply.type === "SENT";

  // Sentiment Analysis (Client-side)
  let sentiment: "positive" | "negative" | "neutral" | "ooo" = "neutral";
  const bodyLower = reply.body.toLowerCase();
  if (
    /unsubscribe|remove me|not interested|stop|don't email|no thanks/.test(
      bodyLower,
    )
  )
    sentiment = "negative";
  else if (/out of office|ooo|vacation|leave|away/.test(bodyLower))
    sentiment = "ooo";
  else if (
    /interested|call|meeting|schedule|more info|sounds good|yes/.test(bodyLower)
  )
    sentiment = "positive";

  const sentimentBadges = {
    positive: (
      <span className="skeu-badge bg-green-500/10 text-green-600 border-green-500/20 text-xs py-0.5 px-2">
        🟢 Interested
      </span>
    ),
    negative: (
      <span className="skeu-badge skeu-badge-failed text-xs py-0.5 px-2">
        🔴 Not Interested
      </span>
    ),
    ooo: (
      <span className="skeu-badge bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs py-0.5 px-2">
        🔵 Out of Office
      </span>
    ),
    neutral: null,
  };

  // URL Link Preview Strip
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = Array.from(new Set(reply.body.match(urlRegex) || []));

  // Thread Parser
  const bodyLines = reply.body.split("\n");
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
  const mainBody = newLines.join("\n").trim();
  const quotedThread = threadLines.join("\n").trim();

  // Stats from mailEvents
  // @ts-expect-error - mailEvents populated via API
  const mailEvents = reply.recipient.mailEvents || [];
  const opens = mailEvents.filter(
    (e: { type: string }) => e.type === "OPENED",
  ).length;
  const clicks = mailEvents.filter(
    (e: { type: string }) => e.type === "CLICKED",
  ).length;



  const handleCopyDraft = () => {
    if (!responseText) return;
    navigator.clipboard.writeText(responseText);
    toast.success("Draft copied to clipboard!");
  };

  return (
    <DrawerContent className="inset-y-0 right-0 left-auto top-0 bottom-0 mt-0 w-full sm:w-[600px] lg:w-[800px] h-full rounded-none outline-none flex flex-col bg-bg-base border-l border-t-0 border-border-subtle text-text-primary">
      {/* Header Actions */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
        {!isSent && (
          <button
            onClick={() => toggleFlag(reply.id)}
            className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors cursor-pointer border -sm ${reply.isFlagged ? "skeu-badge-warning" : "bg-bg-base text-text-muted hover:text-text-primary border-border-subtle"}`}
            title={
              reply.isFlagged ? "Remove Follow-Up Flag" : "Mark as Follow-Up"
            }
          >
            <Flag size={14} className={reply.isFlagged ? "fill-current" : ""} />
          </button>
        )}
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer border border-border-subtle bg-bg-base -sm"
          title="Close Drawer (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 w-full space-y-6">
        {/* Email Header Info */}
        <div className="pr-24">
          <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2 flex-wrap">
            <span>{reply.subject || "(No Subject)"}</span>
            {reply.repliedAt && (
              <span className="skeu-badge skeu-badge-replied text-xs py-0.5 px-2">
                Replied
              </span>
            )}
            {!isSent && sentimentBadges[sentiment]}
          </h2>

          {/* Quick Profile Card */}
          <div className="bg-bg-subtle/50 border border-border-subtle rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-text-primary">
                {isSent ? reply.recipient.email : reply.fromEmail}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                Campaign:{" "}
                <span className="font-medium text-text-primary">
                  {reply.campaign.name}
                </span>
              </div>
            </div>
            {mailEvents.length > 0 && (
              <div className="flex gap-4 text-xs pr-2">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-text-primary text-sm">
                    {opens}
                  </span>
                  <span
                    className="text-text-muted uppercase tracking-wider"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Opens
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-text-primary text-sm">
                    {clicks}
                  </span>
                  <span
                    className="text-text-muted uppercase tracking-wider"
                    style={{ fontSize: "0.6rem" }}
                  >
                    Clicks
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-subtle flex items-center justify-center text-primary-base font-bold uppercase shrink-0">
                {isSent
                  ? reply.recipient.email[0].toUpperCase()
                  : reply.fromEmail[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary truncate">
                  {isSent ? `To: ${reply.recipient.email}` : reply.fromEmail}
                </div>
                <div className="text-sm text-text-muted truncate">
                  {reply.recipient.email}
                </div>
              </div>
            </div>
            <div className="text-sm text-text-muted whitespace-nowrap shrink-0 ml-2">
              {new Date(reply.receivedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="text-text-primary whitespace-pre-wrap leading-relaxed min-h-[100px]">
          {mainBody || reply.body}

          {quotedThread && (
            <div className="mt-4">
              <button
                onClick={() => setShowThread(!showThread)}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 font-medium transition-colors"
              >
                <div className="w-6 border-b border-border-subtle inline-block mr-1"></div>
                ••• {showThread ? "Hide" : "Show"} previous messages
              </button>
              {showThread && (
                <div className="mt-4 pl-4 border-l-2 border-border-subtle text-text-muted text-sm whitespace-pre-wrap opacity-80">
                  {quotedThread}
                </div>
              )}
            </div>
          )}
        </div>

        {/* URL Link Preview Strip */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border-subtle">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs bg-bg-subtle border border-border-subtle px-2.5 py-1.5 rounded hover:bg-bg-muted transition-colors max-w-[250px]"
              >
                <ExternalLink size={12} className="shrink-0 text-text-muted" />
                <span className="truncate text-text-secondary">
                  {link.replace(/^https?:\/\//, "")}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Reply Section */}
        <div className="mt-8 pt-6 border-t border-border-subtle pb-6">
          {isSent && (
            <div className="mb-4 bg-primary-base/10 rounded-lg p-3 text-primary-base text-xs border border-primary-base/20 font-medium">
              You are sending a direct follow-up to this outbound campaign
              email. This will create a new thread.
            </div>
          )}
          <div className="flex flex-col gap-2 mt-4 justify-between mb-3 relative">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              Draft Reply
            </h3>

            <div className="flex items-center gap-2 relative mb-2">
              {/* Templates Dropdown */}
              <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-text-muted hover:text-text-primary bg-bg-subtle border border-border-subtle"
                  >
                    Templates
                    <ChevronDown size={12} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[250px] p-1 max-h-[300px] overflow-y-auto"
                >
                  {templates.length === 0 ? (
                    <div className="text-xs text-text-muted px-4 py-2">
                      No templates found.
                    </div>
                  ) : (
                    templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        className="w-full text-xs text-left px-3 py-2 hover:bg-bg-subtle text-text-secondary transition-colors truncate rounded-sm"
                        onClick={() => {
                          const dynamicData: Record<string, string> = {};
                          if (reply?.recipient?.dynamicData) {
                            for (const [k, v] of Object.entries(
                              reply.recipient.dynamicData,
                            )) {
                              dynamicData[k] = String(v);
                            }
                          }
                          setResponseSubject(
                            renderTemplate(tpl.subject as string, dynamicData),
                          );
                          setResponseText(
                            renderTemplate(tpl.body as string, dynamicData),
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
                          prev ? `${prev}\n\n${snippet}` : snippet,
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
            <div className="flex flex-wrap gap-2 mb-3">
              {aiChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setResponseText((prev) =>
                      prev ? `${prev} ${chip}` : chip,
                    );
                    setAiChips((prev) => prev.filter((_, i) => i !== idx));
                    textareaRef.current?.focus();
                  }}
                  className="text-xs bg-primary-base/10 text-primary-base border border-primary-base/20 px-3 py-1.5 rounded-full hover:bg-primary-base/20 transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="mb-3 space-y-3">
            <Input
              type="text"
              className="skeu-input w-full font-medium"
              value={responseSubject}
              onChange={(e) => setResponseSubject(e.target.value)}
              placeholder="Subject..."
            />
            <Textarea
              ref={textareaRef}
              className="skeu-textarea w-full"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your reply to this prospect... (Cmd+Enter to send)"
              rows={4}
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestReply}
                disabled={aiGenerating}
                className="h-8 text-xs"
                title="Generate starters (Cmd+G)"
              >
                <Sparkles size={14} className="mr-1.5" />
                {aiGenerating ? "Generating..." : "AI Suggestions"}
              </Button>
              {responseText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="h-8 text-xs px-2"
                  title="Copy draft"
                >
                  <Copy size={14} />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showSendAgainConfirm ? (
                <div className="flex items-center gap-2 animate-fade-in bg-warning-bg border border-transparent px-3 py-1.5 rounded">
                  <span className="text-xs text-warning-text font-medium">
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
                    className="text-xs font-bold text-warning-text hover:text-warning-text"
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
                  className="h-9"
                >
                  {!sending && <Send size={16} className="mr-2" />}
                  {sending
                    ? "Sending..."
                    : reply.repliedAt
                      ? "Send Again"
                      : "Send"}
                </Button>
              )}
            </div>
          </div>
          <div className="text-right text-[10px] text-text-muted mt-2 opacity-50">
            ⌘↵ to send • Esc to close • ⌘G for AI
          </div>
        </div>
      </div>
    </DrawerContent>
  );
}
