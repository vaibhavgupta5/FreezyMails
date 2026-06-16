import { NextResponse } from 'next/server'
import { getGoogleOAuthClient } from '@/lib/google-auth'
import { getUser } from '@/lib/supabase'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const client = getGoogleOAuthClient()
    
    // Generate secure random state
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent so we always get a refresh token
      scope: [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: state
    })
    
    return NextResponse.redirect(url)
  } catch (error: any) {
    return NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(error.message)}`, request.url))
  }
}
