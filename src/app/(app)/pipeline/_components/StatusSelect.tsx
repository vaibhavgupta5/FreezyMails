"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUSES = ["APPLIED", "REPLIED", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED", "WITHDRAWN"];

export default function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <select
      className="skeu-select h-8 rounded-md px-2 text-xs w-full"
      value={status}
      aria-label="Application status"
      onChange={async (e) => {
        const res = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: e.target.value }) });
        if (res.ok) router.refresh();
        else toast.error("Could not update status");
      }}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
