'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

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

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return
    
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
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input 
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded shadow-inner text-sm focus:ring-ice-500 focus:border-ice-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <FileText size={64} className="text-surface-300" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              No templates found
            </h3>
            <p className="text-surface-600 mt-1">
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
                  <h3 className="font-bold text-lg text-surface-900 dark:text-surface-50 truncate pr-2">{t.name}</h3>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="text-surface-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400 truncate">{t.subject}</p>
              </div>
              <div>
                <div className="skeu-divider" />
                <div className="flex justify-between items-center text-xs text-surface-500">
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/templates/${t.id}`}
                    className="text-ice-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <Edit2 size={12} /> Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
