import prisma from '../lib/prisma'
import { renderTemplate, wrapLinksForTracking } from '../lib/template-parser'
import { sendEmail } from '../lib/mailer'
import { MailEventType } from '@prisma/client'
import type { Job } from 'pg-boss'

interface SendEmailData {
  recipientId: string;
  campaignId: string;
  accountId: string;
  templateVariantId: string | null;
  subjectVariantId: string | null;
  sequenceStepId?: string | null;
}

export async function handleSendEmail(jobOrJobs: Job<SendEmailData> | Job<SendEmailData>[]) {
  const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs]
  console.log(`Picked up ${jobs.length} email job(s) from queue...`)

  for (const job of jobs) {
    const { recipientId, campaignId, accountId, templateVariantId, subjectVariantId, sequenceStepId } = job.data
    
    try {
      // Load necessary data
      const recipient = await prisma.recipient.findUnique({ 
        where: { id: recipientId },
        include: { mailEvents: true } 
      })
      const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { template: true },
      })
      
      if (!recipient || !account || !campaign) {
        throw new Error('Missing associated records')
      }

      // If this is a follow-up step, check if they already replied
      if (sequenceStepId) {
        const hasReplied = recipient.mailEvents.some(e => e.type === MailEventType.REPLIED)
        if (hasReplied) {
          console.log(`Recipient ${recipient.email} already replied. Skipping follow-up.`)
          return
        }
      }

      if (campaign.status === 'PAUSED' || campaign.status === 'DRAFT') {
        throw new Error(`Campaign is ${campaign.status}, aborting job.`)
      }

      // Check suppression list
      const suppressed = await prisma.suppression.findUnique({
        where: { userId_email: { userId: campaign.userId, email: recipient.email } }
      })
      if (suppressed) {
        await prisma.recipient.update({ where: { id: recipient.id }, data: { status: 'FAILED', failReason: 'Unsubscribed' } })
        return
      }

      let subject = ''
      let bodyTemplate = ''

      if (sequenceStepId) {
        const step = await prisma.sequenceStep.findUnique({ where: { id: sequenceStepId } })
        if (!step) throw new Error('Sequence step not found')
        subject = step.subject
        bodyTemplate = step.body
      } else {
        if (templateVariantId) {
          const tVariant = await prisma.aBTemplateVariant.findUnique({ where: { id: templateVariantId } })
          if (tVariant) {
            bodyTemplate = tVariant.body
          }
        } 
        
        if (subjectVariantId) {
          const sVariant = await prisma.aBSubjectVariant.findUnique({ where: { id: subjectVariantId } })
          if (sVariant) {
            subject = sVariant.subject
          }
        } 
        
        if (!subject) {
          const template = campaign.template
          if (!template) throw new Error('Missing template')
          subject = template.subject
          bodyTemplate = template.body
        }
      }

      // Render template
      const dynamicData = recipient.dynamicData as Record<string, string> || {}
      const renderedBody = renderTemplate(bodyTemplate, dynamicData)
      const renderedSubject = renderTemplate(subject, dynamicData)
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const unsubscribeUrl = `${appUrl}/api/unsubscribe/${recipient.id}`
      
      let finalBody = renderedBody.replace(/{{unsubscribeLink}}/g, unsubscribeUrl)
      if (!finalBody.includes(unsubscribeUrl)) {
        finalBody += `\n\n<p><a href="${unsubscribeUrl}" style="color:#9ca3af;font-size:12px">Unsubscribe</a></p>`
      }

      finalBody = wrapLinksForTracking(finalBody, recipient.id, appUrl)
      
      const pixelUrl = `${appUrl}/api/track/open/${recipient.id}`
      
      // Send email
      console.log(`Sending email to ${recipient.email} via ${account.provider}...`)
      const attachments = (campaign.template?.attachments as any[]) || []
      const sendResult = await sendEmail(account, recipient.email, renderedSubject, finalBody, pixelUrl, attachments)
      console.log(`✅ Sent successfully to ${recipient.email}`)

      // Update recipient and create event
      await prisma.$transaction([
        prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'SENT', sentAt: new Date() }
        }),
        prisma.mailEvent.create({
          data: {
            recipientId: recipient.id,
            campaignId: campaign.id,
            type: MailEventType.SENT,
            metadata: { messageId: sendResult.messageId, accountId: account.id }
          }
        })
      ])
      
      // Schedule follow-up if applicable
      const steps = await prisma.sequenceStep.findMany({ where: { campaignId }, orderBy: { stepIndex: 'asc' } })
      if (steps.length > 0) {
        let nextStep = steps[0]
        if (sequenceStepId) {
          const currentStepIndex = steps.findIndex(s => s.id === sequenceStepId)
          if (currentStepIndex !== -1 && currentStepIndex + 1 < steps.length) {
            nextStep = steps[currentStepIndex + 1]
          } else {
            nextStep = null as any
          }
        }

        if (nextStep) {
          const delaySeconds = nextStep.delayDays * 24 * 60 * 60
          const { default: boss, JOB_SEND_EMAIL } = await import('../lib/queue')
          await boss.send(JOB_SEND_EMAIL, {
            recipientId: recipient.id,
            campaignId,
            accountId: account.id,
            templateVariantId: null,
            subjectVariantId: null,
            sequenceStepId: nextStep.id,
          }, { startAfter: delaySeconds })
        }
      }
      
      // Campaign completion check
      const pendingCount = await prisma.recipient.count({
        where: { campaignId, status: 'PENDING' }
      })
      // If we use sequence steps, we might not want to mark as DONE until all sequences are complete. 
      // For now, keep the basic logic or omit it since 'DONE' in UI usually means all pending initial sends are done.
      if (pendingCount === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'DONE' }
        })
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`❌ Failed to send to recipient ${recipientId}:`, errorMessage)
      
      const isBounce = errorMessage.includes('550') || errorMessage.includes('bounced') || errorMessage.includes('rejected')
      const newStatus = isBounce ? 'BOUNCED' : 'FAILED'

      await prisma.recipient.update({
        where: { id: recipientId },
        data: { status: newStatus, failReason: errorMessage }
      })

      if (isBounce) {
        await prisma.mailEvent.create({
          data: {
            recipientId: recipientId,
            campaignId: campaignId,
            type: 'BOUNCED'
          }
        })

        const bounceCount = await prisma.recipient.count({
          where: { campaignId, status: 'BOUNCED' }
        })
        const totalCount = await prisma.recipient.count({
          where: { campaignId }
        })
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { bounceThreshold: true }
        })

        if (totalCount > 0 && campaign && (bounceCount / totalCount * 100) > campaign.bounceThreshold) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'PAUSED' }
          })
          console.log(`Paused campaign ${campaignId} due to high bounce rate.`)
        }
      }
      
      // Campaign completion check
      const pendingCount = await prisma.recipient.count({
        where: { campaignId, status: 'PENDING' }
      })
      if (pendingCount === 0 && !isBounce) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'DONE' }
        })
      }

      throw err // Let pg-boss handle the retry backoff
    }
  }
}
