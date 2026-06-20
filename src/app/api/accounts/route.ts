import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { encryptString } from '@/lib/encrypt'
import { z } from 'zod'

const accountSchema = z.object({
  label: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().min(1),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  imapHost: z.string().min(1),
  imapPort: z.coerce.number().min(1),
  imapUser: z.string().min(1),
  imapPass: z.string().min(1),
})

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      label: true,
      fromName: true,
      fromEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      imapHost: true,
      imapPort: true,
      imapUser: true,
      isActive: true,
      healthScore: true,
      createdAt: true,
    }
  })

  return NextResponse.json(accounts)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = accountSchema.parse(body)

    const existing = await prisma.emailAccount.findFirst({
      where: { userId: user.id, fromEmail: data.fromEmail }
    })

    let account;
    if (existing) {
      account = await prisma.emailAccount.update({
        where: { id: existing.id },
        data: {
          label: data.label,
          fromName: data.fromName,
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpUser: data.smtpUser,
          smtpPassEncrypted: encryptString(data.smtpPass),
          imapHost: data.imapHost,
          imapPort: data.imapPort,
          imapUser: data.imapUser,
          imapPassEncrypted: encryptString(data.imapPass),
          provider: 'smtp',
          isActive: true,
          healthScore: 100
        },
        select: {
          id: true,
          label: true,
          fromEmail: true,
          smtpHost: true,
          isActive: true,
        }
      })
    } else {
      account = await prisma.emailAccount.create({
        data: {
          userId: user.id,
          label: data.label,
          fromName: data.fromName,
          fromEmail: data.fromEmail,
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpUser: data.smtpUser,
          smtpPassEncrypted: encryptString(data.smtpPass),
          imapHost: data.imapHost,
          imapPort: data.imapPort,
          imapUser: data.imapUser,
          imapPassEncrypted: encryptString(data.imapPass),
          provider: 'smtp',
          isActive: true,
          healthScore: 100
        },
        select: {
          id: true,
          label: true,
          fromEmail: true,
          smtpHost: true,
          isActive: true,
        }
      })
    }

    return NextResponse.json(account)
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
