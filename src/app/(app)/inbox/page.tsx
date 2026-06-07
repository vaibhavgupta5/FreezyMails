'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'

export default function InboxPage() {
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/replies')
      .then(res => res.json())
      .then(data => {
        setReplies(data.replies || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8">Loading inbox...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Unified Inbox</h1>
      
      {replies.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <Inbox size={64} className="text-surface-300" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900">No replies yet</h3>
            <p className="text-surface-600 mt-1">Once prospects reply to your campaigns, they'll appear here.</p>
          </div>
        </div>
      ) : (
        <div className="skeu-card p-0 divide-y divide-surface-400 overflow-hidden">
          {replies.map(reply => (
            <Link key={reply.id} href={`/inbox/${reply.id}`} className={`block p-4 hover:bg-surface-50 transition-colors ${!reply.isRead ? 'bg-ice-50 font-semibold' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm text-gray-500">{reply.campaign.name}</span>
                <span className="text-xs text-gray-400">{new Date(reply.receivedAt).toLocaleString()}</span>
              </div>
              <div className="text-lg">{reply.fromEmail}</div>
              <div className="text-sm text-gray-700 truncate">{reply.subject}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
