'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, FileText, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import ConfirmPopup from '@/components/ui/ConfirmPopup'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function CampaignActions({ id, status, name, dailyLimit }: { id: string, status: string, name?: string, dailyLimit?: number | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      const endpoint = status === 'DRAFT' ? `/api/send/${id}` : `/api/campaigns/${id}/resume`
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        toast.success('Campaign started')
        router.refresh()
      } else {
        toast.error('Failed to start campaign')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Campaign deleted')
        router.refresh()
      } else {
        toast.error('Failed to delete campaign')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/campaigns/${id}/edit`}
            className="p-2 text-text-muted hover:text-primary-base hover:bg-bg-subtle rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Edit size={18} />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Edit Campaign</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href={`/campaigns/${id}`} 
            className="p-2 text-text-muted hover:text-primary-base hover:bg-bg-subtle rounded transition" 
          >
            <FileText size={18} />
          </Link>
        </TooltipTrigger>
        <TooltipContent>View/Edit Details</TooltipContent>
      </Tooltip>
      
      {(status === 'DRAFT' || status === 'PAUSED') && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="none"
              onClick={handleSend}
              disabled={loading || deleting}
              isLoading={loading}
              className="p-2 text-text-muted hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50" 
            >
              <Send size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Campaign</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="none"
            onClick={(e) => {
              e.stopPropagation()
              setShowConfirm(true)
            }}
            disabled={loading || deleting}
            isLoading={deleting}
            className="p-2 text-text-muted hover:text-danger-text hover:bg-danger-bg rounded transition disabled:opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Trash2 size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete Campaign</TooltipContent>
      </Tooltip>

      <ConfirmPopup
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? All recipients and associated data will be permanently deleted. This action cannot be undone."
        confirmText="Delete Campaign"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  )
}
