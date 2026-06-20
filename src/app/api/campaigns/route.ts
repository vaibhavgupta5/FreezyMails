import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getUser } from '@/lib/supabase'
import { z } from 'zod'
import { assignStableBucket } from '@/lib/assignment'
import crypto from 'crypto'

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  templateId: z.string().min(1, 'Template is required'),
  emailAccountIds: z.array(z.string()).min(1, 'At least one Email Account is required'),
  recipients: z.array(
    z.object({
      email: z.string().email('Invalid email address')
    }).passthrough()
  ).min(1, 'At least one recipient is required'),
  sendWindowStart: z.number().nullable().optional(),
  sendWindowEnd: z.number().nullable().optional(),
  timezone: z.string().optional(),
  scheduledAt: z.string().nullable().optional(),
  templateVariants: z.array(z.object({
    name: z.string(),
    body: z.string(),
    splitPercent: z.number().default(100),
    subjectVariants: z.array(z.object({
      name: z.string(),
      subject: z.string(),
      splitPercent: z.number().default(100)
    })).min(1, 'At least one subject variant is required')
  })).optional()
})

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await request.json()
    const data = campaignSchema.parse(payload)

    // Verify ownership of template and accounts
    const template = await prisma.template.findUnique({ where: { id: data.templateId, userId: user.id } })
    const accounts = await prisma.emailAccount.findMany({ 
      where: { 
        id: { in: data.emailAccountIds }, 
        userId: user.id 
      } 
    })

    if (!template || accounts.length !== data.emailAccountIds.length) {
      return NextResponse.json({ error: 'Invalid template or email accounts' }, { status: 400 })
    }

    // Create Campaign and Recipients in an atomic transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const hasVariants = data.templateVariants && data.templateVariants.length > 0;
      
      const newCampaign = await tx.campaign.create({
        data: {
          userId: user.id,
          name: data.name,
          templateId: data.templateId,
          emailAccounts: {
            connect: data.emailAccountIds.map(id => ({ id }))
          },
          status: 'DRAFT',
          abEnabled: hasVariants,
          sendWindowStart: data.sendWindowStart,
          sendWindowEnd: data.sendWindowEnd,
          timezone: data.timezone || 'UTC',
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        }
      })

      const createdTemplateVariants: { id: string; splitPercent: number; subjects: { id: string; splitPercent: number }[] }[] = [];
      if (hasVariants) {
        for (const tv of data.templateVariants!) {
          const templateVariant = await tx.aBTemplateVariant.create({
            data: {
              campaignId: newCampaign.id,
              templateId: data.templateId,
              name: tv.name,
              body: tv.body,
              splitPercent: tv.splitPercent,
            }
          })

          const createdSubjects = [];
          for (const sv of tv.subjectVariants) {
            const subjectVariant = await tx.aBSubjectVariant.create({
              data: {
                templateVariantId: templateVariant.id,
                name: sv.name,
                subject: sv.subject,
                splitPercent: sv.splitPercent,
              }
            })
            createdSubjects.push({ id: subjectVariant.id, splitPercent: subjectVariant.splitPercent });
          }

          createdTemplateVariants.push({
            id: templateVariant.id,
            splitPercent: templateVariant.splitPercent,
            subjects: createdSubjects
          });
        }
      }

      const recipientData = data.recipients.map((row) => {
        const { email, ...dynamicData } = row
        
        const recipientId = crypto.randomUUID(); // Pre-generate ID for stable hashing
        
        if (hasVariants && createdTemplateVariants.length > 0) {
          const tVariantId = assignStableBucket(recipientId + newCampaign.id, createdTemplateVariants);
          if (tVariantId) {
            dynamicData._templateVariantId = tVariantId;
            const tVariant = createdTemplateVariants.find(t => t.id === tVariantId);
            if (tVariant && tVariant.subjects.length > 0) {
              const sVariantId = assignStableBucket(recipientId + tVariant.id, tVariant.subjects);
              if (sVariantId) {
                dynamicData._subjectVariantId = sVariantId;
              }
            }
          }
        }

        return {
          id: recipientId,
          campaignId: newCampaign.id,
          email: String(email).trim().toLowerCase(),
          dynamicData: dynamicData as Prisma.InputJsonObject,
        }
      })

      // Bulk create recipients
      await tx.recipient.createMany({
        data: recipientData
      })

      return newCampaign
    })

    return NextResponse.json({ id: campaign.id })
  } catch (_err: unknown) { const err = _err as Error;
    console.error('Campaign creation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 400 })
  }
}
