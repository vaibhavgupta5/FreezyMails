"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface OutreachRow {
  id: string;
  status: string;
  toEmail: string;
  subject: string;
  body: string;
  company: string;
  role: string | null;
  sourceUrl: string | null;
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function Row({ row }: { row: OutreachRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(row.subject);
  const [body, setBody] = useState(row.body);
  const [busy, setBusy] = useState(false);
  const editable = row.status === "DRAFT" || row.status === "APPROVED";
  const dirty = subject !== row.subject || body !== row.body;

  const act = async (action?: "approve" | "reject" | "reopen") => {
    setBusy(true);
    try {
      await call(`/api/outreach/${row.id}`, "PATCH", { action, ...(dirty ? { subject, body } : {}) });
      toast.success(action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="skeu-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{row.company}{row.role ? ` · ${row.role}` : ""}</p>
          <p className="text-xs text-text-muted">To {row.toEmail}{row.sourceUrl ? <> · <a className="underline" href={row.sourceUrl} target="_blank" rel="noreferrer">source</a></> : null}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full border border-border">{row.status}</span>
      </div>
      {editable ? (
        <>
          <Input className="skeu-input" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea className="skeu-input w-full min-h-40 rounded-md p-3 text-sm" value={body} maxLength={2500} onChange={(e) => setBody(e.target.value)} aria-label="Body" />
          <div className="flex flex-wrap gap-2">
            {dirty && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act()}>Save edits (needs approval again)</Button>}
            {row.status === "DRAFT" && <Button size="sm" variant="primary" disabled={busy || dirty} onClick={() => act("approve")}>Approve</Button>}
            {row.status === "APPROVED" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("reopen")}>Back to draft</Button>}
            <Button size="sm" variant="danger" disabled={busy} onClick={() => act("reject")}>Reject</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">{row.subject}</p>
          <p className="text-sm text-text-muted whitespace-pre-wrap">{row.body}</p>
        </>
      )}
    </div>
  );
}

export default function OutreachQueue({ rows, approvedCount, draftCount }: { rows: OutreachRow[]; approvedCount: number; draftCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (url: string, ok: (d: Record<string, number>) => string) => {
    setBusy(true);
    try {
      const d = await call(url, "POST");
      toast.success(ok(d));
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={busy || draftCount === 0} onClick={() => run("/api/outreach/approve-all", (d) => `Approved ${d.approved}`)}>Approve all drafts ({draftCount})</Button>
        <Button variant="primary" disabled={busy || approvedCount === 0} onClick={() => run("/api/outreach/queue", (d) => `Queued ${d.queued}, ${d.remainingToday} left today`)}>Send approved ({approvedCount})</Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-text-muted">Nothing here yet. Ask Claude Code to draft outreach from your shortlisted jobs.</p> : rows.map((r) => <Row key={r.id + r.status} row={r} />)}
    </div>
  );
}
