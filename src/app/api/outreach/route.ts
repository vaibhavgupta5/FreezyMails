import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { reconcile } from '@/lib/agent'

// Website session only: approving outreach is a human decision, so API keys can never reach these routes.
export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await reconcile(user.id)
  const status = new URL(request.url).searchParams.get('status')
  const rows = await prisma.outreach.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { company: { select: { name: true } }, job: { select: { title: true, url: true } } },
  })
  return NextResponse.json(rows)
}

export const dynamic = 'force-dynamic'
