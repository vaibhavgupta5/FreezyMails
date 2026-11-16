import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { DOC_KINDS, MAX_DOC_BYTES, detectResumeIssues, extractText, getOrCreateProfile } from '@/lib/profile'

export const maxDuration = 60

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const kind = String(form?.get('kind') ?? 'RESUME').toUpperCase()
  const pasted = String(form?.get('text') ?? '').trim()
  const label = String(form?.get('name') ?? '').trim().slice(0, 80)

  if (!(DOC_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: 'Invalid document kind' }, { status: 400 })
  }

  let name: string
  let mimeType: string
  let buffer: Buffer
  let text: string

  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_DOC_BYTES) {
        return NextResponse.json({ error: 'File is larger than 5 MB' }, { status: 400 })
      }
      buffer = Buffer.from(await file.arrayBuffer())
      name = label || file.name
      mimeType = file.type || 'application/octet-stream'
      text = await extractText(buffer, mimeType, file.name)
    } else if (pasted) {
      buffer = Buffer.from(pasted, 'utf8')
      if (buffer.length > MAX_DOC_BYTES) return NextResponse.json({ error: 'Text is too long' }, { status: 400 })
      name = label || (kind === 'COVER_LETTER' ? 'Cover letter' : 'Pasted text')
      mimeType = 'text/plain'
      text = pasted
    } else {
      return NextResponse.json({ error: 'Attach a file or paste text' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not read the file' }, { status: 400 })
  }

  const profile = await getOrCreateProfile(user.id)
  const existing = await prisma.profileDocument.count({ where: { profileId: profile.id, kind } })
  const doc = await prisma.profileDocument.create({
    data: {
      profileId: profile.id,
      kind,
      name,
      mimeType,
      sizeBytes: buffer.length,
      fileData: buffer,
      extractedText: text,
      isDefault: existing === 0,
    },
    select: { id: true, kind: true, name: true, mimeType: true, sizeBytes: true, isDefault: true, createdAt: true },
  })

  return NextResponse.json({ ...doc, textLength: text.length, warnings: kind === 'RESUME' ? detectResumeIssues(text) : [] }, { status: 201 })
}

export const dynamic = 'force-dynamic'
