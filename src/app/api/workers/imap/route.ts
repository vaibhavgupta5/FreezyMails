import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import boss, { JOB_POLL_IMAP } from '@/lib/queue'
import { pollReplies } from '@/lib/imap'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await boss.start()
  } catch (err: any) {
    if (!err.message.includes('already started')) throw err
  }

  // Enqueue jobs
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true }
  })

  const jobs = accounts.map(acc => ({
    name: JOB_POLL_IMAP,
    data: { accountId: acc.id },
    options: { retryLimit: 2 }
  }))

  if (jobs.length > 0) {
    await boss.insert(jobs)
  }

  // Register worker
  await boss.work(JOB_POLL_IMAP, { teamSize: 2, teamConcurrency: 2 }, async (job) => {
    const { accountId } = job.data as any
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
    if (account && account.isActive) {
      await pollReplies(account)
    }
  })

  return NextResponse.json({ ok: true, queued: jobs.length })
}
