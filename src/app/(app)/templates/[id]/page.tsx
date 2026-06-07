import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import TemplateForm from '../_components/TemplateForm'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const template = await prisma.template.findUnique({
    where: { id: params.id, userId: user.id }
  })

  if (!template) {
    redirect('/templates')
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/templates" className="text-surface-500 hover:text-surface-900 transition-colors bg-white p-2 rounded-full shadow-skeu-raised hover:shadow-skeu-pressed">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Edit Template</h1>
      </div>
      
      <TemplateForm initialData={template} />
    </div>
  )
}
