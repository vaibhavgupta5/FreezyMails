import { NextResponse } from 'next/server'
import boss, { JOB_SEND_EMAIL, startBoss } from '@/lib/queue'
import prisma from '@/lib/prisma'
import { renderTemplate } from '@/lib/template-parser'
import { sendEmail } from '@/lib/mailer'
import { MailEventType } from '@prisma/client'

export async function POST(request: Request) {
  // Protect with CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new Error('CRON_SECRET is not configured')
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Start pg-boss if not running
  await startBoss()

  // Worker registration for SEND_EMAIL has been moved to src/workers/index.ts
  // This endpoint can be kept as a no-op if Vercel cron still calls it, 
  // but it is no longer responsible for processing jobs.

  return NextResponse.json({ ok: true })
}
