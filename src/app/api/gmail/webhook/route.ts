import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import boss, { startBoss, JOB_SYNC_GMAIL } from '@/lib/queue'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Pub/Sub payload is base64 encoded in message.data
    if (!body.message || !body.message.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const decodedStr = Buffer.from(body.message.data, 'base64').toString('utf8')
    const data = JSON.parse(decodedStr)
    
    const emailAddress = data.emailAddress
    const historyId = data.historyId

    if (!emailAddress) {
      return NextResponse.json({ error: 'No email address in payload' }, { status: 400 })
    }

    // Find the corresponding active account
    const account = await prisma.emailAccount.findFirst({
      where: {
        provider: 'google',
        fromEmail: emailAddress,
        isActive: true
      }
    })

    if (!account) {
      // Return 200 so Google stops retrying for disconnected accounts
      return NextResponse.json({ ok: true, ignored: true })
    }

    // Enqueue a sync job
    await startBoss()
    
    // De-duplicate jobs: if a sync for this account is already in the queue, 
    // we can use a deterministic key or just let it process.
    await boss.send(JOB_SYNC_GMAIL, {
      accountId: account.id,
      historyId: historyId
    }, {
      singletonKey: `sync_gmail_${account.id}`,
      singletonSeconds: 10 // Only enqueue once every 10 seconds per account
    })

    return NextResponse.json({ ok: true })
  } catch (_err: unknown) { const err = _err as Error;
    console.error('Gmail webhook error:', err)
    // Always return 200 unless it's a transient DB error, 
    // otherwise Google Pub/Sub will backoff heavily.
    return NextResponse.json({ ok: true, error: err.message })
  }
}


export const dynamic = 'force-dynamic'
