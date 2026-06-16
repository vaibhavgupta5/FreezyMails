import prisma from '../lib/prisma'
import { pollReplies } from '../lib/imap'
import type { Job } from 'pg-boss'

interface ImapPollData {
  accountId: string;
}

export async function handleImapPoll(jobOrJobs: Job<ImapPollData> | Job<ImapPollData>[]) {
  const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs]
  for (const job of jobs) {
    const { accountId } = job.data
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
    if (account && account.isActive) {
      await pollReplies(account)
    }
  }
}
