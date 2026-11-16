import { NextResponse } from 'next/server'
import type { GithubSnapshotData } from '@/lib/github'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { extractFactsFromDocument, githubFacts, type ProposedFact } from '@/lib/facts'
import { getOrCreateProfile } from '@/lib/profile'

export const maxDuration = 120

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Proposes facts from saved resumes, cover letters and the GitHub snapshot. Nothing is approved automatically.
export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrCreateProfile(user.id)
  const [docs, snapshot, existing] = await Promise.all([
    prisma.profileDocument.findMany({
      where: { profileId: profile.id, kind: { in: ['RESUME', 'COVER_LETTER'] }, extractedText: { not: '' } },
      select: { id: true, name: true, extractedText: true },
    }),
    prisma.githubSnapshot.findUnique({ where: { profileId: profile.id } }),
    prisma.profileFact.findMany({ where: { profileId: profile.id }, select: { text: true } }),
  ])

  const proposed: ProposedFact[] = []
  const errors: string[] = []

  if (snapshot) proposed.push(...githubFacts(snapshot.data as unknown as GithubSnapshotData))
  for (const d of docs) {
    try {
      proposed.push(...(await extractFactsFromDocument({ id: d.id, name: d.name, text: d.extractedText })))
    } catch (err) {
      errors.push(`${d.name}: ${err instanceof Error ? err.message : 'extraction failed'}`)
    }
  }

  const seen = new Set(existing.map((f) => norm(f.text)))
  const fresh = proposed.filter((f) => {
    const key = norm(f.text)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (fresh.length > 0) {
    await prisma.profileFact.createMany({
      data: fresh.map((f) => ({
        profileId: profile.id,
        text: f.text,
        kind: f.kind,
        sourceUrl: f.sourceUrl ?? null,
        sourceDocId: f.sourceDocId ?? null,
        status: 'PROPOSED',
        proposedBy: 'app',
      })),
    })
  }

  return NextResponse.json({ added: fresh.length, skippedDuplicates: proposed.length - fresh.length, errors })
}

export const dynamic = 'force-dynamic'
