import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { loadScoreContext, syncAtsCompany } from '@/lib/sourcing/sync'
import { reconcile } from '@/lib/agent'

export const maxDuration = 300

// Daily cron: refresh ATS boards that have not been synced in 20 hours and reconcile applications.
// Only for users who finished setup and have not paused the agent. Same CRON_SECRET as the other workers.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) throw new Error('CRON_SECRET is not configured')
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profiles = await prisma.profile.findMany({ where: { setupCompletedAt: { not: null }, agentPaused: false }, select: { userId: true } })
  const stale = new Date(Date.now() - 20 * 3600 * 1000)
  let synced = 0, failed = 0
  for (const { userId } of profiles) {
    await reconcile(userId)
    const companies = await prisma.company.findMany({ where: { userId, atsKind: { not: null }, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: stale } }] }, take: 40 })
    if (companies.length === 0) continue
    const ctx = await loadScoreContext(userId)
    for (const c of companies) {
      try { await syncAtsCompany(userId, c, ctx); synced++ } catch { failed++ }
    }
  }
  return NextResponse.json({ users: profiles.length, synced, failed })
}

export const dynamic = 'force-dynamic'
