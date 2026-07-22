import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { pollReplies } from '@/lib/imap'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { userId: user.id, isActive: true }
    })

    // Poll IMAP for all active accounts for the user
    // Run sequentially to avoid rate limits or memory spikes
    for (const account of accounts) {
      try {
        await pollReplies(account)
      } catch (_err: unknown) { const err = _err as Error;
        console.error(`Failed to poll IMAP for account ${account.id}:`, err)
        // Optionally mark account as inactive if credentials are fundamentally broken
        if (err.message && err.message.includes('ciphertext format')) {
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: { isActive: false }
          })
        }
      }
    }

    return NextResponse.json({ success: true, syncedAccounts: accounts.length })
  } catch (_error: unknown) { const error = _error as Error;
    console.error('Error syncing IMAP replies:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync replies' }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
