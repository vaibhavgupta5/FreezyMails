import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { generateApiKey } from '@/lib/api-auth'

const MAX_ACTIVE_KEYS = 10

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  // "write" lets Claude propose changes (for example facts). Proposals still need your approval in the app.
  scopes: z.enum(['read', 'write']).default('read'),
})

// Keys are managed from the signed-in website session only. An API key can never create or list keys.
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, createdAt: true },
  })
  return NextResponse.json(keys)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const active = await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null } })
  if (active >= MAX_ACTIVE_KEYS) {
    return NextResponse.json({ error: `Limit of ${MAX_ACTIVE_KEYS} active keys reached. Revoke one first.` }, { status: 400 })
  }

  const { key, hashedKey, keyPrefix } = generateApiKey()
  const record = await prisma.apiKey.create({
    data: { userId: user.id, name: parsed.data.name, hashedKey, keyPrefix, scopes: parsed.data.scopes === 'write' ? ['read', 'write'] : ['read'] },
    select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true },
  })

  // The plaintext key is returned exactly once.
  return NextResponse.json({ ...record, key }, { status: 201 })
}

export const dynamic = 'force-dynamic'
