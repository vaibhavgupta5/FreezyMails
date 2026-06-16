import { OAuth2Client } from 'google-auth-library'
import prisma from '@/lib/prisma'

import { encryptString, decryptString } from '@/lib/encrypt'

export function getGoogleOAuthClient() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Google OAuth credentials in environment (.env.local)')
  }
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || !account.refreshToken) {
    throw new Error('Account not found or missing Google refresh token')
  }

  const client = getGoogleOAuthClient()
  
  const decryptedRefresh = decryptString(account.refreshToken)
  const decryptedAccess = account.accessToken ? decryptString(account.accessToken) : undefined
  
  // Provide the current tokens. The library uses the refresh_token to get a new access_token if expired.
  client.setCredentials({
    refresh_token: decryptedRefresh,
    access_token: decryptedAccess,
    expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined,
  })

  // Automatically refreshes the token if needed
  const { token } = await client.getAccessToken()
  
  if (!token) {
    throw new Error('Failed to retrieve valid access token from Google')
  }

  // Update the database with the potentially new tokens
  const credentials = client.credentials
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      accessToken: encryptString(credentials.access_token || token),
      tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      ...(credentials.refresh_token && { refreshToken: encryptString(credentials.refresh_token) }),
    }
  })

  return token
}
