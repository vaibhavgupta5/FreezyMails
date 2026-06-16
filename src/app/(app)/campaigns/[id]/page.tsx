"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Copy,
  RotateCcw,
  Beaker,
} from "lucide-react";
import toast from "react-hot-toast";
import PageSkeleton from "../../_components/PageSkeleton";

interface CampaignData {
  name: string;
  status: string;
  template?: { subject: string };
  abEnabled?: boolean;
  abVariants?: { id: string; name: string; subject: string; body: string; isWinner: boolean; openCount: number; replyCount: number; }[];
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

  const fetchCampaign = async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (!data) return;

    const fetchProgress = async () => {
      const res = await fetch(`/api/campaigns/${id}/progress`);
      const progData = await res.json();
      setProgress(progData);
      
      // If the backend says it's done but our local data still says SENDING, refresh
      if ((progData.status === "DONE" || progData.status === "PAUSED") && data.status === "SENDING") {
        fetchCampaign();
      }
    };

    // Always fetch once to get the current stats
    fetchProgress();

    // Only set up a polling loop if the campaign is actively sending
    if (data.status === "SENDING") {
      const intervalId = setInterval(fetchProgress, 3000);
      return () => clearInterval(intervalId);
    }
  }, [data?.status, id]);

  const handleAction = async (action: "pause" | "resume" | "duplicate" | "send" | "resendAll" | "resendFailed") => {
    try {
      if (action === "resendAll" || action === "resendFailed") {
        const type = action === "resendAll" ? "all" : "failed";
        const resendRes = await fetch(`/api/campaigns/${id}/resend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type })
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
        fetchCampaign();
        return;
      }

      const url = action === "send" ? `/api/send/${id}` : `/api/campaigns/${id}/${action}`;
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
        const actionMap: Record<string, string> = { pause: "paused", resume: "resumed", send: "started" };
        toast.success(`Campaign ${actionMap[action]}!`);
        fetchCampaign();
      }
    } catch (_err: unknown) { const err = _err as Error;
      toast.error(err.message || "An error occurred");
    }
  };

  if (loading) return <PageSkeleton />;
  if (!data || data.error)
    return (
      <div className="p-8 text-red-500">
        Error: {data?.error || "Failed to load"}
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-1">{data.name}</h1>
          <span
            className={`skeu-badge skeu-badge-${data.status.toLowerCase()}`}
          >
            {data.status}
          </span>
        </div>

        <div className="flex gap-2">
          {data.status === "SENDING" && (
            <button
              onClick={() => handleAction("pause")}
              className="skeu-btn-ghost flex items-center gap-1"
            >
              <Pause size={16} /> Pause
            </button>
          )}
          {(data.status === "DRAFT" || data.status === "PAUSED") && (
            <button
              onClick={() => handleAction(data.status === "DRAFT" ? "send" : "resume")}
              className="skeu-btn-primary flex items-center gap-1"
            >
              <Play size={16} /> {data.status === "DRAFT" ? "Start Campaign" : "Resume"}
            </button>
          )}
          {data.status === "DONE" && (
            <>
              <button
                onClick={() => handleAction("resendAll")}
                className="skeu-btn-primary flex items-center gap-1"
              >
                <RotateCcw size={16} /> Resend All
              </button>
              {(progress?.failed || 0) > 0 && (
                <button
                  onClick={() => handleAction("resendFailed")}
                  className="skeu-btn-ghost flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RotateCcw size={16} /> Resend Failed ({progress?.failed})
                </button>
              )}
            </>
          )}
          <button
            onClick={() => handleAction("duplicate")}
            className="skeu-btn-ghost flex items-center gap-1"
          >
            <Copy size={16} /> Duplicate
          </button>
        </div>
      </div>

      <div className="skeu-card">
        <h2 className="text-xl font-semibold mb-4">Send Progress</h2>
        {progress ? (
          <div>
            <div className="flex justify-between text-sm mb-2 text-surface-900 font-medium">
              <span>
                {progress.sent} Sent / {progress.total} Total
              </span>
              <span>
                {Math.round(
                  ((progress.sent + progress.failed) / progress.total) * 100,
                ) || 0}
                %
              </span>
            </div>
            <div className="skeu-progress-bar mb-4">
              <div
                style={{
                  width: `${Math.round(((progress.sent + progress.failed) / progress.total) * 100) || 0}%`,
                }}
              ></div>
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <span className="text-green-600">{progress.sent} Sent</span>
              <span className="text-red-600">{progress.failed} Failed</span>
              <span className="text-surface-600">
                {progress.pending} Pending
              </span>
            </div>
          </div>
        ) : (
          <p className="text-surface-500">No active sending progress.</p>
        )}
      </div>

      {data.abEnabled && data.abVariants && data.abVariants.length > 0 && (
        <div className="skeu-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Beaker size={20} className="text-ice-500" />
            A/B Test Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.abVariants.map((variant: { id: string; name: string; subject: string; body: string; isWinner: boolean; openCount: number; replyCount: number; }, index: number) => (
              <div key={variant.id} className={`p-4 border rounded-lg ${variant.isWinner ? 'border-amber-400 bg-amber-50' : 'border-surface-200 bg-white dark:bg-surface-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-surface-900 dark:text-surface-50">
                    {variant.name} {variant.isWinner && <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full uppercase tracking-wider">Winner</span>}
                  </h3>
                  <div className="text-xs text-surface-500 font-medium">
                    {variant.openCount} Opens | {variant.replyCount} Replies
                  </div>
                </div>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{variant.subject}</p>
                <p className="text-xs text-surface-500 mt-1 line-clamp-2">{variant.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
