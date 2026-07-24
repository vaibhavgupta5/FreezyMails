"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Unplug } from "lucide-react";
import ConfirmPopup from "@/components/ui/ConfirmPopup";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DisconnectAccountButton({ accountId }: { accountId: string }) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const [isOpen, setIsOpen] = useState(false);

 const { mutate: handleDisconnect, isPending: isDisconnecting } = useMutation({
  mutationFn: () => fetch(`/api/accounts/${accountId}`, { method: "DELETE" }).then(async r => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || "Failed to disconnect account");
    }
  }),
  onSuccess: () => {
    toast.success("Account disconnected successfully");
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    router.refresh();
  },
  onError: (err: Error) => toast.error(err.message || "Failed to disconnect"),
 });

 return (
 <>
 <button
 onClick={() => setIsOpen(true)}
 disabled={isDisconnecting}
 className="p-1 text-text-muted hover:text-danger-text transition-colors disabled:opacity-50"
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
