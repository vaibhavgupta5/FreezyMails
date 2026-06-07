import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default async function TemplatesPage() {
  const user = await getUser()
  if (!user) return null

  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/templates/new" className="skeu-btn-primary">New Template</Link>
      </div>

      {templates.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <FileText size={64} className="text-surface-300" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900">No templates yet</h3>
            <p className="text-surface-600 mt-1">Create a template to reuse your best cold emails.</p>
          </div>
          <Link href="/templates/new" className="skeu-btn-primary mt-4">Create Template</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="skeu-card flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                <p className="text-sm text-surface-600 truncate">{t.subject}</p>
              </div>
              <div>
                <div className="skeu-divider" />
                <div className="flex justify-between items-center text-xs text-surface-500">
                  <span>{t.createdAt.toLocaleDateString()}</span>
                  <Link href={`/templates/${t.id}`} className="text-ice-600 font-medium hover:underline">Edit</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
