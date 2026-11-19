import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export const createClientServer = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Context: Called from Server Component. Handled by middleware if present.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Context: Called from Server Component. Handled by middleware if present.
          }
        },
      },
    }
  )
})

// The app's User row is normally created at the OAuth callback. A session that predates it (or a
// deleted row) would break every foreign key, so make sure it exists once per process per user.
const knownUsers = new Set<string>()

export const getUser = cache(async () => {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email && !knownUsers.has(user.id)) {
    try {
      const { default: prisma } = await import('@/lib/prisma')
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: { id: user.id, email: user.email, name: user.user_metadata?.full_name ?? null, avatarUrl: user.user_metadata?.avatar_url ?? null },
      })
      knownUsers.add(user.id)
    } catch (e) {
      console.error('Could not ensure app user row:', (e as Error).message)
    }
  }
  return user
})
