import { NextResponse } from 'next/server'
import { getGoogleOAuthClient } from '@/lib/google-auth'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const client = getGoogleOAuthClient()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent so we always get a refresh token
      scope: [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: user.id // Pass user ID as state to link account in callback
    })
    
    return NextResponse.redirect(url)
  } catch (error: any) {
    return NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(error.message)}`, request.url))
  }
}
