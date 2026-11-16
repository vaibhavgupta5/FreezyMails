import crypto from 'crypto'
import prisma from '@/lib/prisma'

export const API_KEY_PREFIX = 'fm_'
export type ApiScope = 'read' | 'write'
export const ALL_SCOPES: ApiScope[] = ['read', 'write']

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/** Returns the plaintext key once. Only the hash is stored. */
export function generateApiKey() {
  const key = API_KEY_PREFIX + crypto.randomBytes(32).toString('base64url')
  return { key, hashedKey: hashApiKey(key), keyPrefix: key.slice(0, 11) }
}

export interface ApiKeyAuth {
  userId: string
  keyId: string
  scopes: string[]
}

/** Website session first, then a Bearer API key. For read-only routes that Claude Code also needs. */
export async function getRequestUserId(request: Request): Promise<string | null> {
  const { getUser } = await import('@/lib/supabase')
  const user = await getUser()
  if (user) return user.id
  const auth = await authenticateApiKey(request)
  return auth?.userId ?? null
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token.trim()
}

/** Resolves a Bearer API key to its user and scopes. Revoked or unknown keys return null. */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuth | null> {
  const token = bearerToken(request)
  if (!token || !token.startsWith(API_KEY_PREFIX)) return null

  const record = await prisma.apiKey.findUnique({ where: { hashedKey: hashApiKey(token) } })
  if (!record || record.revokedAt) return null

  // Throttle the write: only touch lastUsedAt if it is stale by a minute.
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60_000) {
    prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {})
  }

  return { userId: record.userId, keyId: record.id, scopes: record.scopes }
}
