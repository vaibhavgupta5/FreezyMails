import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { smtpHost, smtpPort, smtpUser, smtpPass } = body

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000, // 10 seconds
    })

    await transporter.verify()
    
    return NextResponse.json({ ok: true })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ ok: false, error: err.message })
  }
}


export const dynamic = 'force-dynamic'
