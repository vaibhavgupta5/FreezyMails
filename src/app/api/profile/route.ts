import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { computeSetupStatus, getOrCreateProfile } from '@/lib/profile'

const list = z.array(z.string().trim().min(1).max(80)).max(40)

const updateSchema = z.object({
  headline: z.string().trim().max(160).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  workAuth: z.string().trim().max(200).nullable().optional(),
  gradYear: z.number().int().min(1990).max(2100).nullable().optional(),
  salaryFloor: z.string().trim().max(80).nullable().optional(),
  roleTypes: list.optional(),
  targetRoles: list.optional(),
  excludedCompanies: list.optional(),
  excludedKeywords: list.optional(),
  links: z
    .object({
      linkedin: z.string().url().or(z.literal('')).optional(),
      portfolio: z.string().url().or(z.literal('')).optional(),
      x: z.string().url().or(z.literal('')).optional(),
    })
    .optional(),
})

async function payload(userId: string) {
  const profile = await getOrCreateProfile(userId)
  const [documents, facts, snapshot, status] = await Promise.all([
    prisma.profileDocument.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true, name: true, mimeType: true, sizeBytes: true, isDefault: true, createdAt: true, extractedText: true },
    }),
    prisma.profileFact.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: 'desc' } }),
    prisma.githubSnapshot.findUnique({ where: { profileId: profile.id } }),
    computeSetupStatus(userId),
  ])
  return {
    profile,
    documents: documents.map(({ extractedText, ...d }) => ({ ...d, textLength: extractedText.length })),
    facts,
    github: snapshot,
    status,
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await payload(user.id))
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  await getOrCreateProfile(user.id)
  await prisma.profile.update({ where: { userId: user.id }, data: parsed.data })
  return NextResponse.json(await payload(user.id))
}

export const dynamic = 'force-dynamic'
