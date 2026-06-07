"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Play,
  Pause,
  Trash2,
  Edit2,
  Plus,
  ArrowRight,
  BarChart2,
  Beaker,
} from "lucide-react";
import PageSkeleton from "../../_components/PageSkeleton";

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (!data || (data.status !== "SENDING" && !progress)) return;

    let intervalId: NodeJS.Timeout;

    const pollProgress = async () => {
      const res = await fetch(`/api/campaigns/${id}/progress`);
      const progData = await res.json();
      setProgress(progData);
      if (progData.status === "DONE" || progData.status === "PAUSED") {
        clearInterval(intervalId);
        fetchCampaign(); // refresh status
      }
    };

    pollProgress();
    intervalId = setInterval(pollProgress, 3000);

    return () => clearInterval(intervalId);
  }, [data, id]);

  const handleAction = async (action: "pause" | "resume" | "duplicate") => {
    const res = await fetch(`/api/campaigns/${id}/${action}`, {
      method: "POST",
    });
    if (res.ok) {
      if (action === "duplicate") {
        const { newId } = await res.json();
        router.push(`/campaigns/${newId}`);
      } else {
        fetchCampaign();
      }
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
          {data.status === "PAUSED" && (
            <button
              onClick={() => handleAction("resume")}
              className="skeu-btn-primary flex items-center gap-1"
            >
              <Play size={16} /> Resume
            </button>
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
    </div>
  );
}
