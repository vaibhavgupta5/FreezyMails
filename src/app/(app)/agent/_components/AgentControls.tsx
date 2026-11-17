"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AgentControls({ paused, dailyCap }: { paused: boolean; dailyCap: number }) {
  const router = useRouter();
  const [cap, setCap] = useState(String(dailyCap));
  const [busy, setBusy] = useState(false);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const res = await fetch("/api/agent", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) { toast.success(msg); router.refresh(); }
    else toast.error("Could not save");
  };

  return (
    <div className="skeu-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{paused ? "Agent is paused" : "Agent is active"}</p>
          <p className="text-xs text-text-muted max-w-md">
            {paused
              ? "Claude Code tools that change anything are blocked, and sending campaigns were paused. Resume campaigns yourself from the Campaigns page."
              : "Pausing blocks every Claude Code tool that changes data and pauses all sending campaigns immediately."}
          </p>
        </div>
        <Button variant={paused ? "primary" : "danger"} disabled={busy} onClick={() => patch({ paused: !paused }, paused ? "Agent resumed" : "Agent paused")}>
          {paused ? "Resume agent" : "Pause everything"}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <label className="text-sm">
          Daily outreach cap (1 to 100)
          <Input className="skeu-input mt-1 w-32" type="number" min={1} max={100} value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
        <Button variant="ghost" disabled={busy} onClick={() => patch({ dailyCap: Number(cap) }, "Cap saved")}>Save cap</Button>
      </div>
    </div>
  );
}
