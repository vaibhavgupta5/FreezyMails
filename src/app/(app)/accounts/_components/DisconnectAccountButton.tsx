"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Unplug } from "lucide-react";
import ConfirmPopup from "@/components/ui/ConfirmPopup";

export default function DisconnectAccountButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect account");
      }
      toast.success("Account disconnected successfully");
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isDisconnecting}
        className="p-1 text-surface-400 hover:text-red-500 transition-colors disabled:opacity-50"
        title="Disconnect account"
      >
        <Unplug size={16} />
      </button>

      <ConfirmPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Disconnect Account?"
        description="This will permanently delete your email account and any replies directly associated with it. This action cannot be undone."
        onConfirm={handleDisconnect}
        confirmText="Disconnect"
        isLoading={isDisconnecting}
      />
    </>
  );
}
