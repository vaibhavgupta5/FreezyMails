import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  attachments: z.array(
    z.object({
      filename: z.string(),
      content: z.string(),
      encoding: z.string().optional(),
    })
  ).optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await prisma.template.findUnique({
    where: { id }
  })

  if (!template || template.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await request.json()
    const data = templateSchema.parse(payload)

    // Extract dynamic variables like {{firstName}}
    const varRegex = /\{\{(.*?)\}\}/g
    const subjectVars = Array.from(data.subject.matchAll(varRegex)).map(m => m[1].trim())
    const bodyVars = Array.from(data.body.matchAll(varRegex)).map(m => m[1].trim())
    
    const variables = Array.from(new Set([...subjectVars, ...bodyVars]))

    const template = await prisma.template.update({
      where: { id, userId: user.id },
      data: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        variables: variables,
        attachments: data.attachments || [],
      }
    })

    return NextResponse.json(template)
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.template.delete({
      where: { id, userId: user.id }
    })
    return NextResponse.json({ success: true }) 
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    return NextResponse.json({ error: error.message || 'Failed to delete or not found' }, { status: 400 })
  }
}
