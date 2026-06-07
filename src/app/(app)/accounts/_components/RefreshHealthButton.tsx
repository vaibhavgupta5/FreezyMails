'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RefreshHealthButton({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/health`, { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleRefresh} disabled={loading} className="text-surface-600 hover:text-ice-600 transition-colors" title="Refresh health">
      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
    </button>
  )
}
