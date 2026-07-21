import prisma from '../lib/prisma'
import { pollReplies } from '../lib/imap'
import type { Job } from 'pg-boss'

interface SyncGmailData {
  accountId: string;
}

export async function handleGmailSync(jobOrJobs: Job<SyncGmailData> | Job<SyncGmailData>[]) {
  const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs]
  for (const job of jobs) {
    const { accountId } = job.data
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
    if (!account || !account.isActive) continue
    await pollReplies(account)
  }
}
