import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import boss, { JOB_POLL_IMAP, startBoss } from '@/lib/queue'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new Error('CRON_SECRET is not configured')
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await startBoss()

  // Enqueue jobs
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true }
  })

  const jobs = accounts.map(acc => ({
    data: { accountId: acc.id },
    options: { retryLimit: 2 }
  }))

  if (jobs.length > 0) {
    await boss.insert(JOB_POLL_IMAP, jobs)
  }

  // Worker registration for JOB_POLL_IMAP has been moved to src/workers/index.ts
  // This endpoint now only enqueues the polling jobs.

  return NextResponse.json({ ok: true, queued: jobs.length })
}
