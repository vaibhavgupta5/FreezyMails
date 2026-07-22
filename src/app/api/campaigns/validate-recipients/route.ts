import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase'
import prisma from '@/lib/prisma'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emails } = await request.json()
  if (!Array.isArray(emails)) return NextResponse.json({ error: 'emails must be an array' }, { status: 400 })

  const suppressedRecords = await prisma.suppression.findMany({
    where: { userId: user.id, email: { in: emails.map((e: string) => e.toLowerCase()) } },
    select: { email: true }
  })
  const suppressedSet = new Set(suppressedRecords.map(r => r.email))

  const seen = new Set<string>()
  const invalid: string[] = []
  const duplicates: string[] = []
  const suppressed: string[] = []
  const valid: string[] = []

  for (const email of emails) {
    const lower = email.toLowerCase().trim()
    if (!isValidEmail(lower)) {
      invalid.push(email)
    } else if (seen.has(lower)) {
      duplicates.push(email)
    } else if (suppressedSet.has(lower)) {
      suppressed.push(email)
    } else {
      valid.push(lower)
      seen.add(lower)
    }
  }

  return NextResponse.json({ valid: valid.length, invalid, duplicates, suppressed })
}


export const dynamic = 'force-dynamic'
