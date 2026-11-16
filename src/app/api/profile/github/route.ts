import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { fetchGithubSnapshot, isValidGithubUsername } from '@/lib/github'
import { getOrCreateProfile } from '@/lib/profile'

export const maxDuration = 60

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { username?: string }
  const username = String(body.username ?? '').trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '').replace(/\/.*$/, '')
  if (!isValidGithubUsername(username)) {
    return NextResponse.json({ error: 'Enter a valid GitHub username' }, { status: 400 })
  }

  try {
    const data = await fetchGithubSnapshot(username)
    const profile = await getOrCreateProfile(user.id)
    const json = data as unknown as Prisma.InputJsonObject
    const snapshot = await prisma.githubSnapshot.upsert({
      where: { profileId: profile.id },
      update: { username: data.username, data: json, fetchedAt: new Date() },
      create: { profileId: profile.id, username: data.username, data: json },
    })
    await prisma.profile.update({ where: { id: profile.id }, data: { githubUsername: data.username } })
    return NextResponse.json(snapshot)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'GitHub fetch failed' }, { status: 502 })
  }
}

export const dynamic = 'force-dynamic'
