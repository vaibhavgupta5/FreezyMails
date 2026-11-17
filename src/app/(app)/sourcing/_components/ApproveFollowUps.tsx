"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ApproveFollowUps({ clusterId }: { clusterId: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="primary"
      onClick={async () => {
        const res = await fetch(`/api/clusters/${clusterId}/approve-followups`, { method: "POST" });
        if (res.ok) { toast.success("Follow-ups approved"); router.refresh(); }
        else toast.error("Could not approve");
      }}
    >
      Approve follow-ups
    </Button>
  );
}
