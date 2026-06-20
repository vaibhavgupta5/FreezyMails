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
          } catch (error) {
            // Context: Called from Server Component. Handled by middleware if present.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Context: Called from Server Component. Handled by middleware if present.
          }
        },
      },
    }
  )
})

export const getUser = cache(async () => {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
