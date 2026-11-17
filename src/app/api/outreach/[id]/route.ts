import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { addressBlocked, checkDraftText } from '@/lib/agent'

const schema = z.object({
  action: z.enum(['approve', 'reject', 'reopen']).optional(),
  subject: z.string().max(120).optional(),
  body: z.string().max(2500).optional(),
})

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const o = await prisma.outreach.findFirst({ where: { id, userId: user.id } })
  if (!o) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['DRAFT', 'APPROVED', 'REJECTED'].includes(o.status)) return NextResponse.json({ error: `Cannot change a ${o.status} email` }, { status: 400 })

  const subject = parsed.data.subject ?? o.subject
  const body = parsed.data.body ?? o.body
  const edited = subject !== o.subject || body !== o.body
  if (edited) {
    const bad = checkDraftText(subject, body)
    if (bad) return NextResponse.json({ error: bad }, { status: 400 })
  }
  let status = o.status
  let approvedAt = o.approvedAt
  if (parsed.data.action === 'approve') {
    const blocked = await addressBlocked(user.id, o.toEmail, o.id)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })
    status = 'APPROVED'; approvedAt = new Date()
  } else if (parsed.data.action === 'reject') { status = 'REJECTED'; approvedAt = null }
  else if (parsed.data.action === 'reopen' || edited) { status = 'DRAFT'; approvedAt = null } // an edit needs a fresh approval
  const row = await prisma.outreach.update({ where: { id }, data: { subject, body, status, approvedAt } })
  return NextResponse.json(row)
}

export const dynamic = 'force-dynamic'
