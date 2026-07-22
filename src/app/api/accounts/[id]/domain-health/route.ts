import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { checkDomainHealth } from '@/lib/domain-health'

export const dynamic = 'force-dynamic'
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.emailAccount.findUnique({
    where: { id: params.id, userId: user.id }
  })

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  try {
    const domain = account.fromEmail.split('@')[1]
    if (!domain) {
      return NextResponse.json({ error: 'Invalid fromEmail format' }, { status: 400 })
    }

    const health = await checkDomainHealth(domain)
    return NextResponse.json(health)
  } catch (_error: unknown) { const error = _error as Error;
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
