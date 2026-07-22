"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Copy,
  RotateCcw,
  Beaker,
  ChevronDown,
  ChevronUp,
  Search,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Inbox,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import PageSkeleton from "../../_components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface CampaignAttachment {
  filename: string;
}

interface Recipient {
  id: string;
  email: string;
  status: string;
  sentAt?: string | null;
  failReason?: string | null;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  dailyLimit?: number | null;
  createdAt: string;
  scheduledAt?: string | null;
  pacingType?: string;
  template?: {
    name: string;
    subject: string;
    body: string;
    attachments?: CampaignAttachment[];
  };
  abEnabled?: boolean;
  emailAccounts?: { id: string; label: string; fromEmail: string }[];
  abTemplateVariants?: {
    id: string;
    name: string;
    body: string;
    isWinner: boolean;
    openCount: number;
    replyCount: number;
    subjectVariants: {
      id: string;
      name: string;
      subject: string;
      isWinner: boolean;
      openCount: number;
      replyCount: number;
    }[];
  }[];
  totalRecipients?: number;
  error?: string;
}

interface CampaignProgress {
  status: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<CampaignData | null>(null);
  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Recipients tracking
  const [showRecipients, setShowRecipients] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let active = true;
    const loadCampaign = async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (active) {
        setData(json);
        setLoading(false);
      }
    };
    loadCampaign();
    return () => {
      active = false;
    };
  }, [id, refreshKey]);

  useEffect(() => {
    if (!data) return;

    const fetchProgress = async () => {
      const res = await fetch(`/api/campaigns/${id}/progress`);
      const progData = await res.json();
      setProgress(progData);

      if (
        (progData.status === "DONE" || progData.status === "PAUSED") &&
        data.status === "SENDING"
      ) {
        setRefreshKey((prev) => prev + 1);
      }
    };

    fetchProgress();

    if (data.status === "SENDING") {
      const intervalId = setInterval(fetchProgress, 5000);
      return () => clearInterval(intervalId);
    }
  }, [data?.status, id]);

  const handleToggleRecipients = async () => {
    const nextShow = !showRecipients;
    setShowRecipients(nextShow);
    if (nextShow) {
      setRecipientsLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${id}/recipients`);
        if (!res.ok) throw new Error("Failed to load recipients list");
        const data = await res.json();
        setRecipients(data || []);
      } catch {
        toast.error("Failed to load recipients list");
      } finally {
        setRecipientsLoading(false);
      }
    }
  };

  const handleAction = async (
    action:
      | "pause"
      | "resume"
      | "duplicate"
      | "send"
      | "resendAll"
      | "resendFailed",
  ) => {
    try {
      if (action === "resendAll" || action === "resendFailed") {
        const type = action === "resendAll" ? "all" : "failed";
        const resendRes = await fetch(`/api/campaigns/${id}/resend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!resendRes.ok) {
          const err = await resendRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to reset campaign");
        }

        const sendRes = await fetch(`/api/send/${id}`, { method: "POST" });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to start campaign");
        }

        toast.success(`Campaign resending to ${type}!`);
        setRefreshKey((prev) => prev + 1);
        return;
      }

      let url = `/api/campaigns/${id}/${action}`;
      if (action === "send") {
        url =
          data?.scheduledAt && new Date(data.scheduledAt) > new Date()
            ? `/api/campaigns/${id}/schedule`
            : `/api/send/${id}`;
      }

      const res = await fetch(url, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to process request");
      }

      if (action === "duplicate") {
        const { newId } = await res.json();
        toast.success("Campaign duplicated!");
        router.push(`/campaigns/${newId}`);
      } else {
        const actionMap: Record<string, string> = {
          pause: "paused",
          resume: "resumed",
          send: "started",
        };
        toast.success(`Campaign ${actionMap[action]}!`);
        setRefreshKey((prev) => prev + 1);
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message || "An error occurred");
    }
  };

  const filteredRecipients = recipients.filter((r) => {
    const matchesSearch = r.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <PageSkeleton />;
  if (!data || data.error)
    return (
      <div className="p-8 text-danger-text bg-danger-bg rounded-xl border border-border-subtle max-w-xl mx-auto mt-10">
        Error: {data?.error || "Failed to load campaign data"}
      </div>
    );

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold text-text-primary">
                {data.name}
              </h1>
              <Link
                href={`/campaigns/${data.id}/edit`}
                className="p-1.5 text-text-muted hover:text-primary-base hover:bg-bg-subtle rounded transition inline-flex items-center justify-center"
                title="Edit Campaign"
              >
                <Edit size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`skeu-badge skeu-badge-${data.status.toLowerCase()}`}
              >
                {data.status}
              </span>
              {data.pacingType && (
                <span className="text-xs text-text-muted bg-bg-subtle px-2 py-1 rounded-md border border-border-subtle inline-flex items-center gap-1">
                  {data.pacingType === "SLOW" ? (
                    <>
                      <Calendar size={12} /> Slow Drip (4-hr distribution)
                    </>
                  ) : (
                    <>
                      <Play size={12} /> Fast Send (Instant)
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.status === "SENDING" && (
              <Button
                variant="ghost"
                onClick={() => handleAction("pause")}
                leftIcon={<Pause size={16} />}
              >
                Pause
              </Button>
            )}
            {(data.status === "DRAFT" ||
              data.status === "PAUSED" ||
              data.status === "SCHEDULED") && (
              <Button
                variant="primary"
                onClick={() =>
                  handleAction(data.status === "PAUSED" ? "resume" : "send")
                }
                leftIcon={<Play size={16} />}
              >
                {data.status === "PAUSED"
                  ? "Resume"
                  : data?.scheduledAt && new Date(data.scheduledAt) > new Date()
                    ? "Schedule"
                    : "Launch"}
              </Button>
            )}
            {data.status === "DONE" && (
              <>
                {(progress?.failed || 0) > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => handleAction("resendFailed")}
                    leftIcon={<RotateCcw size={16} />}
                    className="text-danger-text border-danger-text/20 hover:bg-danger-bg"
                  >
                    Resend Failed ({progress?.failed})
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => handleAction("resendAll")}
              leftIcon={<RotateCcw size={16} />}
            >
              Restart
            </Button>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="skeu-stat-card flex flex-col justify-center">
            <div className="label">TOTAL RECIPIENTS</div>
            <div className="value">{progress?.total ?? 0}</div>
            <div className="sub text-text-muted">Target audience size</div>
          </div>
          <div className="skeu-stat-card flex flex-col justify-center">
            <div className="label">SENT SUCCESS</div>
            <div className="value">{progress?.sent ?? 0}</div>
            <div className="sub text-success-text font-semibold">
              {progress && progress.total > 0
                ? `${Math.round((progress.sent / progress.total) * 100)}% delivery`
                : "0% delivery"}
            </div>
          </div>
          <div className="skeu-stat-card flex flex-col justify-center">
            <div className="label">FAILED / BOUNCED</div>
            <div className="value">{progress?.failed ?? 0}</div>
            <div
              className={`sub font-semibold ${
                progress && progress.failed > 0
                  ? "text-danger-text"
                  : "text-text-muted"
              }`}
            >
              {progress && progress.total > 0
                ? `${Math.round((progress.failed / progress.total) * 100)}% error rate`
                : "0% error rate"}
            </div>
          </div>
          <div className="skeu-stat-card flex flex-col justify-center">
            <div className="label">PENDING QUEUE</div>
            <div className="value">{progress?.pending ?? 0}</div>
            <div className="sub text-text-muted">Remaining to process</div>
          </div>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT COLUMN: Progress, A/B Testing, Recipients List */}
          <div className="lg:col-span-3 space-y-4">
            {/* SEND PROGRESS CARD */}
            <div className="skeu-card">
              <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase mb-4">
                SEND PROGRESS
              </h3>
              {progress ? (
                <div>
                  <div className="flex justify-between text-sm mb-2 text-text-primary font-semibold">
                    <span>
                      {progress.sent} Sent / {progress.total} Total
                    </span>
                    <span>
                      {Math.round(
                        ((progress.sent + progress.failed) / progress.total) *
                          100,
                      ) || 0}
                      %
                    </span>
                  </div>
                  <div className="skeu-progress-bar mb-4">
                    <div
                      style={{
                        width: `${
                          Math.round(
                            ((progress.sent + progress.failed) /
                              progress.total) *
                              100,
                          ) || 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex gap-4 text-sm font-semibold">
                    <span className="text-success-text">
                      {progress.sent} Sent
                    </span>
                    <span className="text-danger-text">
                      {progress.failed} Failed
                    </span>
                    <span className="text-text-muted">
                      {progress.pending} Pending
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-sm italic">
                  No active sending progress.
                </p>
              )}
            </div>

            {/* A/B TEST RESULTS */}
            {data.abEnabled &&
              data.abTemplateVariants &&
              data.abTemplateVariants.length > 0 && (
                <div className="skeu-card space-y-4">
                  <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase flex items-center gap-2">
                    <Beaker size={16} className="text-text-muted" />
                    A/B Test Results
                  </h2>
                  <div className="space-y-4">
                    {data.abTemplateVariants.map((templateVariant) => (
                      <div
                        key={templateVariant.id}
                        className={`p-4 border rounded-xl shadow-sm ${
                          templateVariant.isWinner
                            ? "border-transparent bg-warning-bg dark:bg-warning-bg"
                            : "border-border-subtle bg-bg-subtle/40"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3 border-b border-border-subtle pb-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 truncate">
                              {templateVariant.name}
                              {templateVariant.isWinner && (
                                <span className="skeu-badge skeu-badge-warning bg-warning-bg">
                                  Winner
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-text-muted truncate mt-1">
                              {templateVariant.body}
                            </p>
                          </div>
                          <div className="text-xs font-semibold bg-bg-base border border-border-subtle px-3 py-1 rounded-md text-text-primary shrink-0 ml-2">
                            {templateVariant.openCount} Opens |{" "}
                            {templateVariant.replyCount} Replies
                          </div>
                        </div>

                        <div className="pl-4 border-l-2 border-border-subtle space-y-3">
                          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                            Subject Line Variants
                          </h4>
                          {templateVariant.subjectVariants.map(
                            (subjectVariant) => (
                              <div
                                key={subjectVariant.id}
                                className={`p-3 border rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                                  subjectVariant.isWinner
                                    ? "border-transparent bg-warning-bg"
                                    : "border-border-subtle bg-bg-base"
                                }`}
                              >
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <div className="flex items-center gap-2 text-sm min-w-0">
                                    <span className="font-semibold text-text-primary shrink-0">
                                      {subjectVariant.name}:
                                    </span>
                                    <span className="text-text-muted truncate">
                                      {subjectVariant.subject}
                                    </span>
                                    {subjectVariant.isWinner && (
                                      <span className="skeu-badge skeu-badge-warning bg-warning-bg">
                                        Winner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-medium text-text-muted shrink-0">
                                    {subjectVariant.openCount} Opens |{" "}
                                    {subjectVariant.replyCount} Replies
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* RECIPIENTS SECTION */}
            <div className="skeu-card p-0 overflow-hidden">
              <button
                onClick={handleToggleRecipients}
                className="w-full flex justify-between items-center px-5 py-4 font-semibold text-sm text-text-primary hover:bg-bg-subtle/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Inbox size={16} className="text-text-muted" />
                  Recipients & Sending List
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-text-muted bg-bg-subtle border border-border-subtle px-2 py-0.5 rounded-full">
                    {progress?.total ?? 0}
                  </span>
                  {showRecipients ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </button>

              {showRecipients && (
                <div className="p-5 border-t border-border-subtle bg-bg-base space-y-4">
                  {/* Search & Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3 top-2.5 text-text-muted"
                      />
                      <input
                        type="text"
                        className="skeu-input pl-9 py-1.5 text-sm bg-bg-base"
                        placeholder="Search by email address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <select
                        className="skeu-select h-[38px] py-1.5 px-3 text-sm bg-bg-base"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="SENT">Sent Successfully</option>
                        <option value="FAILED">Failed / Bounced</option>
                      </select>
                    </div>
                  </div>

                  {/* Recipients Table */}
                  {recipientsLoading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex space-x-4 items-center">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                  ) : filteredRecipients.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted bg-bg-subtle/30 text-sm">
                      No recipients matched the search criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 border border-border-subtle rounded-xl">
                      <table className="skeu-table min-w-full">
                        <thead>
                          <tr className="bg-bg-subtle/50">
                            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                              Email
                            </th>
                            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                              Status
                            </th>
                            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {filteredRecipients.map((recipient) => (
                            <tr
                              key={recipient.id}
                              className="hover:bg-bg-subtle/30 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-text-primary border-b border-border-subtle">
                                {recipient.email}
                              </td>
                              <td className="px-4 py-3 text-sm border-b border-border-subtle">
                                <span
                                  className={`skeu-badge ${
                                    recipient.status === "SENT"
                                      ? "skeu-badge-sent"
                                      : recipient.status === "PENDING"
                                        ? "skeu-badge-pending"
                                        : "skeu-badge-failed"
                                  }`}
                                >
                                  {recipient.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-text-muted border-b border-border-subtle">
                                {recipient.status === "SENT" &&
                                recipient.sentAt ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle
                                      size={12}
                                      className="text-success-text"
                                    />
                                    Sent{" "}
                                    {new Date(
                                      recipient.sentAt,
                                    ).toLocaleString()}
                                  </span>
                                ) : recipient.status === "FAILED" ||
                                  recipient.status === "BOUNCED" ? (
                                  <span
                                    className="flex items-center gap-1 text-danger-text font-medium"
                                    title={recipient.failReason ?? undefined}
                                  >
                                    <AlertCircle size={12} />
                                    {recipient.failReason || "Delivery failed"}
                                  </span>
                                ) : (
                                  <span className="text-text-muted italic">
                                    Waiting in queue
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Configuration Details, Template Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* CONFIGURATION CARD */}
            <div className="skeu-card space-y-4">
              <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">
                CAMPAIGN CONFIGURATION
              </h3>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Calendar size={14} /> Created
                  </span>
                  <span className="font-semibold text-text-primary">
                    {new Date(data.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="border-t border-border-subtle my-2"></div>

                <div>
                  <span className="text-text-muted text-sm flex items-center gap-1.5 mb-2">
                    <Mail size={14} /> Sender Accounts (
                    {data.emailAccounts?.length || 0})
                  </span>
                  {data.emailAccounts && data.emailAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {data.emailAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-2.5 p-2.5 border border-border-subtle rounded-xl bg-bg-subtle/30 text-xs"
                        >
                          <div className="w-7 h-7 rounded-lg bg-bg-base border border-border-subtle flex items-center justify-center shrink-0">
                            <Mail size={14} className="text-text-muted" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary truncate">
                              {account.label}
                            </p>
                            <p className="text-text-muted truncate">
                              {account.fromEmail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">
                      No sending accounts associated.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* TEMPLATE DETAILS CARD */}
            {data.template && (
              <div className="skeu-card space-y-4">
                <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase">
                  EMAIL TEMPLATE
                </h3>
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5 p-3 border border-border-subtle rounded-xl bg-bg-subtle/30">
                    <div className="w-8 h-8 rounded-lg bg-bg-base border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                      <FileText size={16} className="text-text-muted" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Subject Line
                      </span>
                      <h4
                        className="font-semibold text-sm text-text-primary truncate"
                        title={data.template.subject}
                      >
                        {data.template.subject}
                      </h4>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle my-2"></div>

                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Body Copy Preview
                    </span>
                    <div className="p-3 bg-bg-subtle/30 border border-border-subtle rounded-xl text-xs text-text-muted whitespace-pre-line max-h-48 overflow-y-auto font-mono">
                      {data.template.body}
                    </div>
                  </div>

                  {data.template.attachments &&
                    Array.isArray(data.template.attachments) &&
                    data.template.attachments.length > 0 && (
                      <>
                        <div className="border-t border-border-subtle my-2"></div>
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                            Attachments
                          </span>
                          <div className="flex flex-wrap gap-2 p-2.5 bg-bg-subtle/30 border border-border-subtle rounded-xl">
                            {data.template.attachments.map(
                              (att: CampaignAttachment, attIdx: number) => (
                                <span
                                  key={attIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded bg-bg-base border border-border-subtle text-xs font-mono text-text-muted"
                                >
                                  {att.filename}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
