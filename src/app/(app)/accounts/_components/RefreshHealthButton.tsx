'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function RefreshHealthButton({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => fetch(`/api/accounts/${accountId}/health`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Health score refreshed');
    },
    onError: () => toast.error('Failed to refresh health score'),
  });

  return (
    <Button variant="none" onClick={() => mutate()} disabled={isPending} className="text-text-muted hover:text-primary-base transition-colors" title="Refresh health">
      <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
    </Button>
  )
}
