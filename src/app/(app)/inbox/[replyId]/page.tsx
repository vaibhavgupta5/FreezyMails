'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function ReplyPage() {
  const params = useParams()
  const id = params.replyId as string
  
  const [reply, setReply] = useState<any>(null)
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReply = async () => {
      const res = await fetch(`/api/replies/${id}`)
      const data = await res.json()
      setReply(data)
      setLoading(false)

      if (data && !data.isRead) {
        await fetch(`/api/replies/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        })
      }
    }
    fetchReply()
  }, [id])

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
      setReply(updated)
      setResponseText('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!reply) return <div className="p-8">Reply not found.</div>

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-2 gap-8">
      {/* Left side: Original Email (Simplified since we don't have the fully rendered HTML stored, we show recipient + template info) */}
      <div className="skeu-card">
        <h2 className="text-xl font-bold mb-4">Original Email</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase">To</label>
            <div>{reply.recipient.email}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Campaign</label>
            <div>{reply.campaign.name}</div>
          </div>
          {/* Note: In a real app we'd fetch the exact rendered template. Here we just show placeholder for Stage 2 scope. */}
        </div>
      </div>

      {/* Right side: Reply and Composer */}
      <div className="flex flex-col space-y-6">
        <div className="skeu-card">
          <h2 className="text-xl font-bold mb-2">{reply.subject}</h2>
          <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
            <span>From: {reply.fromEmail}</span>
            <span>{new Date(reply.receivedAt).toLocaleString()}</span>
          </div>
          <div className="whitespace-pre-wrap text-gray-800 border-t pt-4">
            {reply.body}
          </div>
        </div>

        <div className="skeu-card flex flex-col">
          <h3 className="font-semibold mb-2">Respond</h3>
          <textarea
            className="skeu-textarea w-full mb-4"
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Type your reply here..."
          />
          <div className="flex justify-between items-center">
            {/* AI Assist button will go here in 2E */}
            <div id="ai-assist-placeholder"></div>
            
            <button
              onClick={onSend}
              disabled={sending || !responseText.trim()}
              className="skeu-btn-primary"
            >
              {sending ? 'Sending...' : (reply.repliedAt ? 'Send Again' : 'Send Reply')}
            </button>
          </div>
          {reply.repliedAt && <p className="text-xs text-gray-500 mt-2 text-right">Replied at {new Date(reply.repliedAt).toLocaleString()}</p>}
        </div>
      </div>
    </div>
  )
}
