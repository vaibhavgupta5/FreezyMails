import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { computeHealthScore } from '@/lib/health'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new Error('CRON_SECRET is not configured')
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true }
  })

  for (const acc of accounts) {
    const score = await computeHealthScore(acc.id)
    await prisma.emailAccount.update({
      where: { id: acc.id },
      data: { healthScore: score }
    })
  }

  return NextResponse.json({ ok: true })
}


export const dynamic = 'force-dynamic'
