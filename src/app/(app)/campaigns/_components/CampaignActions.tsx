'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, Edit, Loader2, FileText } from 'lucide-react'

export default function CampaignActions({ id, status }: { id: string, status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/resume`, { method: 'POST' })
      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to start campaign')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link 
        href={`/campaigns/${id}`} 
        className="p-2 text-surface-500 hover:text-ice-600 hover:bg-ice-50 rounded transition" 
        title="View/Edit Details"
      >
        <FileText size={18} />
      </Link>
      
      {(status === 'DRAFT' || status === 'PAUSED') && (
        <button 
          onClick={handleSend}
          disabled={loading}
          className="p-2 text-surface-500 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50" 
          title="Start Campaign"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      )}
    </div>
  )
}
