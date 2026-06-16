import { NextResponse } from 'next/server'
import { encryptString } from '@/lib/encrypt'
import { getGoogleOAuthClient } from '@/lib/google-auth'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  if (error) {
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/accounts?error=invalid_request`)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  
  // Clear the state cookie
  cookieStore.delete('oauth_state')

  if (!savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/accounts?error=invalid_state`)
  }

  const currentUser = await getUser()
  if (!currentUser) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const client = getGoogleOAuthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)


    // Fetch user profile to get email address
    const profileRes = await client.request({ url: 'https://www.googleapis.com/oauth2/v2/userinfo' })
    const profile = profileRes.data as { email: string; name?: string; given_name?: string }

    const fromEmail = profile.email
    const fromName = profile.name || profile.given_name || 'Google Account'

    // Save to database
    await prisma.emailAccount.create({
      data: {
        userId: currentUser.id,
        provider: 'google',
        label: fromEmail,
        fromName,
        fromEmail,
        accessToken: tokens.access_token ? encryptString(tokens.access_token) : null,
        refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
        healthScore: 100
      }
    })

    return NextResponse.redirect(`${origin}/accounts?success=google_connected`)

  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(err.message)}`)
  }
}
