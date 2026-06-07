import { NextResponse } from 'next/server'
import { getGoogleOAuthClient } from '@/lib/google-auth'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateUserId = searchParams.get('state')

  if (error) {
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(error)}`)
  }

  if (!code || !stateUserId) {
    return NextResponse.redirect(`${origin}/accounts?error=invalid_request`)
  }

  const currentUser = await getUser()
  if (!currentUser || currentUser.id !== stateUserId) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const client = getGoogleOAuthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Fetch user profile to get email address
    const profileRes = await client.request({ url: 'https://www.googleapis.com/oauth2/v2/userinfo' })
    const profile = profileRes.data as any

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
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
        healthScore: 100
      }
    })

    return NextResponse.redirect(`${origin}/accounts?success=google_connected`)

  } catch (err: any) {
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(err.message)}`)
  }
}
