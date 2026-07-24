import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { renderTemplate } from '@/lib/template-parser'
import { sendEmail } from '@/lib/mailer'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { testEmail, sampleData } = await request.json()
  if (!testEmail) return NextResponse.json({ error: 'testEmail is required' }, { status: 400 })

  const template = await prisma.template.findUnique({ where: { id: params.id, userId: user.id } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const accountId = user.user_metadata?.defaultAccountId
  const account = accountId
    ? await prisma.emailAccount.findUnique({ where: { id: accountId, userId: user.id, isActive: true } })
    : await prisma.emailAccount.findFirst({ where: { userId: user.id, isActive: true } })

  if (!account) return NextResponse.json({ error: 'No active email account found. Connect an account first.' }, { status: 400 })

  const data: Record<string, string> = sampleData || {}
  
  const templateFallbacks: Record<string, string> = {}
  if (template.variables) {
    let varsArr: unknown[] = [];
    if (Array.isArray(template.variables)) {
      varsArr = template.variables;
    } else if (typeof template.variables === 'string') {
      try {
        const parsed = JSON.parse(template.variables);
        if (Array.isArray(parsed)) varsArr = parsed;
      } catch (e) {}
    }

    varsArr.forEach(v => {
      if (typeof v === 'object' && v !== null && 'name' in v) {
        const varObj = v as { name: string; fallback?: unknown };
        if (varObj.fallback !== undefined && varObj.fallback !== null) {
          const fallbackStr = String(varObj.fallback).trim();
          if (fallbackStr && fallbackStr !== 'undefined' && fallbackStr !== 'null') {
            templateFallbacks[varObj.name] = fallbackStr;
          }
        }
      }
    })
  }

  const renderedSubject = `[TEST] ${renderTemplate(template.subject, data, templateFallbacks)}`
  const renderedBody = renderTemplate(template.body, data, templateFallbacks)

  const attachments = (template.attachments as { filename: string; content: string; encoding?: string }[]) || []

  try {
    await sendEmail(account, testEmail, renderedSubject, renderedBody, undefined, attachments)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
