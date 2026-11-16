import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { getRequestUserId } from '@/lib/api-auth'

// Download the original file. Also reachable with a Bearer API key so Claude Code can attach it to forms.
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const userId = await getRequestUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await prisma.profileDocument.findFirst({ where: { id, profile: { userId } } })
  if (!doc || !doc.fileData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filename = doc.name.replace(/[^\w.\- ]+/g, '_')
  return new Response(new Uint8Array(doc.fileData), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { isDefault?: boolean; name?: string }
  const doc = await prisma.profileDocument.findFirst({ where: { id, profile: { userId: user.id } } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.isDefault) {
    await prisma.$transaction([
      prisma.profileDocument.updateMany({ where: { profileId: doc.profileId, kind: doc.kind }, data: { isDefault: false } }),
      prisma.profileDocument.update({ where: { id }, data: { isDefault: true } }),
    ])
  }
  if (typeof body.name === 'string' && body.name.trim()) {
    await prisma.profileDocument.update({ where: { id }, data: { name: body.name.trim().slice(0, 80) } })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await prisma.profileDocument.deleteMany({ where: { id, profile: { userId: user.id } } })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
