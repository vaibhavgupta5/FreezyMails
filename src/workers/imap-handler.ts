import prisma from '../lib/prisma'
import { pollReplies } from '../lib/imap'

export async function handleImapPoll(job: any) {
  const { accountId } = job.data as any
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (account && account.isActive) {
    await pollReplies(account)
  }
}
