'use client'

import { useState, useEffect } from 'react'
import PageSkeleton from '../../_components/PageSkeleton'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useInboxStore } from '@/stores/useInboxStore'

export default function ReplyPage() {
  const params = useParams()
  const id = params.replyId as string
  
  const { replies, fetchReplies, markAsRead, updateReply, loading: storeLoading } = useInboxStore()
  
  const reply = replies.find(r => r.id === id)
  
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(false)

  // Initial fetch if store is empty
  useEffect(() => {
    fetchReplies()
  }, [fetchReplies])

  // Mark as read when viewing
  useEffect(() => {
    if (reply && !reply.isRead) {
      markAsRead(id)
      fetch(`/api/replies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      }).catch(console.error)
    }
  }, [reply, id, markAsRead])

  const onSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/replies/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: responseText })
      })
      if (!res.ok) throw new Error('Failed to send')
      const updated = await res.json()
      toast.success('Reply sent successfully')
      updateReply(id, updated)
      setResponseText('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false)
    }
  }

  const [aiGenerating, setAiGenerating] = useState(false)

  const handleSuggestReply = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch('/api/gemini/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail: "I sent an email regarding " + reply?.campaign?.name, // Ideally fetch the real sent body
          replyReceived: reply?.body || ''
        })
      })
      if (!res.ok) throw new Error('AI generation failed')
      const data = await res.json()
      setResponseText(data.reply)
      toast.success('Drafted AI reply!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  if (storeLoading && !reply) return <PageSkeleton />
  if (!reply) return <div className="p-8 text-surface-600">Reply not found.</div>

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left side: Original Email */}
      <div className="skeu-card shadow-skeu-base">
        <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Original Email context</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">To</label>
            <div className="text-surface-900 dark:text-surface-50">{reply.recipient.email}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Campaign</label>
            <div className="text-surface-900 dark:text-surface-50">{reply.campaign.name}</div>
          </div>
          <div className="p-4 bg-ice-50 dark:bg-ice-900/20 text-ice-800 dark:text-ice-200 text-sm border border-ice-100 dark:border-ice-800 rounded">
            Note: Fetching the exact rendered template text will be available in future updates. AI suggestions will use general campaign context for now.
          </div>
        </div>
      </div>

      {/* Right side: Reply and Composer */}
      <div className="flex flex-col space-y-6">
        <div className="skeu-card shadow-skeu-base">
          <h2 className="text-lg font-bold mb-2 text-surface-900 dark:text-surface-50">{reply.subject}</h2>
          <div className="flex justify-between items-center mb-4 text-sm text-surface-500">
            <span className="font-medium text-surface-700 dark:text-surface-300">From: {reply.fromEmail}</span>
            <span>{new Date(reply.receivedAt).toLocaleString()}</span>
          </div>
          <div className="whitespace-pre-wrap text-surface-800 dark:text-surface-200 border-t border-surface-100 dark:border-surface-800 pt-4">
            {reply.body}
          </div>
        </div>

        <div className="skeu-card shadow-skeu-base flex flex-col">
          <h3 className="font-semibold mb-2 text-surface-900 dark:text-surface-50">Draft Response</h3>
          <textarea
            className="w-full mb-4 border border-surface-300 dark:border-surface-600 rounded p-3 shadow-inner bg-white dark:bg-surface-800 focus:ring-ice-500 focus:border-ice-500 text-surface-900 dark:text-surface-50 min-h-[150px]"
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Type your reply here..."
          />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handleSuggestReply}
              disabled={aiGenerating}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-ice-50 dark:bg-ice-900/40 text-ice-700 dark:text-ice-300 hover:bg-ice-100 dark:hover:bg-ice-800 transition-colors border border-ice-200 dark:border-ice-700 rounded shadow-sm w-full sm:w-auto justify-center"
            >
              {aiGenerating ? 'Drafting...' : '✨ Suggest AI Reply'}
            </button>
            
            <button
              onClick={onSend}
              disabled={sending || !responseText.trim()}
              className="skeu-btn-primary w-full sm:w-auto"
            >
              {sending ? 'Sending...' : (reply.repliedAt ? 'Send Again' : 'Send Reply')}
            </button>
          </div>
          {reply.repliedAt && <p className="text-xs text-surface-500 mt-4 text-right">Replied at {new Date(reply.repliedAt).toLocaleString()}</p>}
        </div>
      </div>
    </div>
  )
}
