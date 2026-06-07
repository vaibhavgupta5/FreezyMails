import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import TemplateForm from '../_components/TemplateForm'

export default function NewTemplatePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/templates" className="text-surface-500 hover:text-surface-900 transition-colors bg-white p-2 rounded-full shadow-skeu-raised hover:shadow-skeu-pressed">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Create New Template</h1>
      </div>
      
      <TemplateForm />
    </div>
  )
}
