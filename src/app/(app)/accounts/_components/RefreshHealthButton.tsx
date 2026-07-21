'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
 <Button variant="none" onClick={handleRefresh} disabled={loading} className="text-text-muted hover:text-primary-base transition-colors" title="Refresh health">
 <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
 </Button>
 )
}
