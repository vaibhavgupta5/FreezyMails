import { NextResponse } from 'next/server'
import { generateSubjectVariants } from '@/lib/gemini'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { subject, count } = await request.json()
    const result = await generateSubjectVariants(subject, count)
    return NextResponse.json(result)
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
