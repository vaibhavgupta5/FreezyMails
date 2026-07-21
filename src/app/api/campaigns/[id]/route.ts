import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id, userId: user.id },
    include: {
      template: true,
      emailAccounts: {
        select: {
          id: true,
          label: true,
          fromEmail: true,
          provider: true,
          isActive: true,
        }
      },
      abTemplateVariants: {
        include: {
          subjectVariants: true
        }
      },
    }
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(campaign)
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.campaign.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (_error: unknown) { const error = _error as Error;
    console.error('Delete campaign error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 })
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, dailyLimit, pacingType, timezone, scheduledAt } = body

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(pacingType !== undefined && { pacingType }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null })
      }
    })

    return NextResponse.json(updated)
  } catch (_error: unknown) { const error = _error as Error;
    console.error('Update campaign error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 500 })
  }
}

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
  pacingType: z.string().optional(),
  dailyLimit: z.number().nullable().optional(),
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

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await request.json()
    const data = campaignSchema.parse(payload)

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id },
      include: { emailAccounts: true }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only allow full updates for DRAFT campaigns for safety
    if (campaign.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT campaigns can be fully edited' }, { status: 400 })
    }

    const template = await prisma.template.findUnique({ where: { id: data.templateId, userId: user.id } })
    const accounts = await prisma.emailAccount.findMany({ 
      where: { id: { in: data.emailAccountIds }, userId: user.id } 
    })

    if (!template || accounts.length !== data.emailAccountIds.length) {
      return NextResponse.json({ error: 'Invalid template or email accounts' }, { status: 400 })
    }

    const updatedCampaign = await prisma.$transaction(async (tx) => {
      const hasVariants = data.templateVariants && data.templateVariants.length > 0;
      
      // Update basic fields and disconnect old accounts to connect new ones
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          name: data.name,
          templateId: data.templateId,
          abEnabled: hasVariants,
          pacingType: data.pacingType || 'SLOW',
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          emailAccounts: {
            set: data.emailAccountIds.map(id => ({ id }))
          }
        }
      })

      // Delete old variants
      await tx.aBTemplateVariant.deleteMany({
        where: { campaignId: campaign.id }
      })

      const createdTemplateVariants: { id: string; splitPercent: number; subjects: { id: string; splitPercent: number }[] }[] = [];
      if (hasVariants) {
        for (const tv of data.templateVariants!) {
          const templateVariant = await tx.aBTemplateVariant.create({
            data: {
              campaignId: campaign.id,
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

      // Delete all old recipients and recreate
      await tx.recipient.deleteMany({
        where: { campaignId: campaign.id, status: 'PENDING' }
      })

      const recipientData = data.recipients.map((row) => {
        const { email, ...dynamicData } = row
        const recipientId = crypto.randomUUID();
        
        if (hasVariants && createdTemplateVariants.length > 0) {
          const tVariantId = assignStableBucket(recipientId + campaign.id, createdTemplateVariants);
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
          campaignId: campaign.id,
          email: String(email).trim().toLowerCase(),
          dynamicData: dynamicData as import('@prisma/client').Prisma.InputJsonObject,
        }
      })

      await tx.recipient.createMany({
        data: recipientData
      })

      return campaign
    })

    return NextResponse.json({ id: updatedCampaign.id })
  } catch (_err: unknown) {
    const err = _err as Error;
    console.error('Campaign update error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update campaign' }, { status: 400 })
  }
}

