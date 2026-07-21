'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Trash2, Edit2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ConfirmPopup from '@/components/ui/ConfirmPopup'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Template = {
  id: string
  name: string
  subject: string
  createdAt: Date
}

export default function TemplateList({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [testTemplateId, setTestTemplateId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setTemplates(templates.filter(t => t.id !== id))
      toast.success('Template deleted')
      router.refresh()
    } catch (err) {
      toast.error('Failed to delete template')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleSendTest = async () => {
    if (!testTemplateId || !testEmail) return;
    setIsSendingTest(true);
    try {
      const res = await fetch(`/api/templates/${testTemplateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test email');
      toast.success('Test email sent successfully!');
      setTestTemplateId(null);
      setTestEmail('');
    } catch (_err: unknown) { const err = _err as Error;
      toast.error(err.message);
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input 
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="skeu-input pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <FileText size={64} className="text-text-muted" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              No templates found
            </h3>
            <p className="text-text-muted mt-1">
              {search ? 'Try adjusting your search.' : 'Create a template to reuse your best cold emails.'}
            </p>
          </div>
          {!search && (
            <Link href="/templates/new" className="skeu-btn-primary mt-4">
              Create Template
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <div key={t.id} className="skeu-card flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-text-primary truncate pr-2">{t.name}</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="none"
                        onClick={() => setConfirmDeleteId(t.id)}
                        isLoading={deletingId === t.id}
                        className="text-text-muted hover:text-danger-text transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete template</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-text-muted truncate">{t.subject}</p>
              </div>
              <div>
                <div className="skeu-divider" />
                <div className="flex justify-between items-center text-xs text-text-muted">
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTestTemplateId(t.id)}
                      className="text-primary-base font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={12} /> Test
                    </button>
                    <Link
                      href={`/templates/${t.id}`}
                      className="text-primary-base font-medium hover:underline flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmPopup
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete Template"
        isDanger={true}
        isLoading={deletingId !== null}
      />

      {/* Test Email Modal */}
      {testTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-bg-base rounded-xl border border-border-subtle p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Send Test Email</h3>
            <p className="text-sm text-text-muted mb-4">Enter an email address to receive a test version of this template.</p>
            <Input 
              autoFocus
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="skeu-input mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTestTemplateId(null)} disabled={isSendingTest}>Cancel</Button>
              <Button variant="primary" onClick={handleSendTest} disabled={!testEmail || isSendingTest} isLoading={isSendingTest}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
