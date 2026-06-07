import { ImapFlow } from 'imapflow'
import { EmailAccount, MailEventType, Prisma } from '@prisma/client'
import { decryptString } from './encrypt'
import prisma from './prisma'
import { simpleParser } from 'mailparser'
import { getValidAccessToken } from './google-auth'

export async function pollReplies(account: EmailAccount) {
  let client
  
  if (account.provider === 'google') {
    const accessToken = await getValidAccessToken(account.id)
    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: account.fromEmail,
        accessToken,
      },
      logger: false,
    })
  } else {
    const decryptedPass = account.imapPassEncrypted ? decryptString(account.imapPassEncrypted) : ''
    client = new ImapFlow({
      host: account.imapHost!,
      port: account.imapPort!,
      secure: account.imapPort === 993,
      auth: {
        user: account.imapUser!,
        pass: decryptedPass,
      },
      logger: false,
    })
  }

  await client.connect()

  const lock = await client.getMailboxLock('INBOX')
  try {
    const searchCriteria: any = {}
    if (account.lastPollAt) {
      searchCriteria.since = account.lastPollAt
    } else {
      searchCriteria.since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }

    const messages = client.fetch(searchCriteria, { envelope: true, source: true })
    
    for await (const message of messages) {
      const envelope = message.envelope
      const inReplyTo = envelope.inReplyTo || envelope.replyTo
      const references = envelope.references || []

      const possibleMessageIds = [inReplyTo, ...references].filter(Boolean)
      
      if (possibleMessageIds.length > 0) {
        const matchingCampaigns = await prisma.campaign.findMany({
          where: { emailAccountId: account.id },
          select: { id: true }
        })
        const campaignIds = matchingCampaigns.map(c => c.id)

        const recentSentEvents = await prisma.mailEvent.findMany({
          where: {
            campaignId: { in: campaignIds },
            type: 'SENT',
          },
          include: { recipient: true }
        })

        const matchedEvent = recentSentEvents.find(e => {
          const meta = e.metadata as any
          return meta && meta.messageId && possibleMessageIds.includes(meta.messageId)
        })

        if (matchedEvent) {
          const recipient = matchedEvent.recipient
          
          const parsedMail = await simpleParser(message.source)

          await prisma.$transaction(async (tx) => {
            const existingReply = await tx.reply.findFirst({
              where: {
                campaignId: matchedEvent.campaignId,
                recipientId: recipient.id,
                subject: envelope.subject,
              }
            })

            if (!existingReply) {
              await tx.reply.create({
                data: {
                  campaignId: matchedEvent.campaignId,
                  recipientId: recipient.id,
                  emailAccountId: account.id,
                  fromEmail: envelope.from[0]?.address || 'unknown',
                  subject: envelope.subject || 'No Subject',
                  body: parsedMail.text || 'No text body',
                  receivedAt: envelope.date || new Date(),
                }
              })

              await tx.mailEvent.create({
                data: {
                  recipientId: recipient.id,
                  campaignId: matchedEvent.campaignId,
                  type: MailEventType.REPLIED,
                }
              })

              const variantId = (recipient.dynamicData as any)?._variantId
              if (variantId) {
                const variant = await tx.aBVariant.findUnique({ where: { id: variantId } })
                if (variant) {
                  const newReplyCount = variant.replyCount + 1
                  const updateData: any = { replyCount: newReplyCount }
                  if (!variant.firstReplyAt) {
                    updateData.firstReplyAt = new Date()
                  }
                  
                  if (newReplyCount >= 5 && !variant.isWinner) {
                    const campaign = await tx.campaign.findUnique({ where: { id: matchedEvent.campaignId } })
                    if (campaign && !campaign.winnerVariantId) {
                      updateData.isWinner = true
                      await tx.campaign.update({
                        where: { id: campaign.id },
                        data: { winnerVariantId: variant.id }
                      })
                    }
                  }
                  
                  await tx.aBVariant.update({
                    where: { id: variant.id },
                    data: updateData
                  })
                }
              }
            }
          })
        }
      }
    }

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastPollAt: new Date() }
    })

  } finally {
    lock.release()
    await client.logout()
  }
}
