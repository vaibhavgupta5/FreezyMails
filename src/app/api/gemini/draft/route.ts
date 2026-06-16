import { NextResponse } from 'next/server'
import { generateTemplateDraft } from '@/lib/gemini'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const context = await request.json()
    const result = await generateTemplateDraft(context)
    return NextResponse.json(result)
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
