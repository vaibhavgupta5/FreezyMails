import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await prisma.template.findUnique({
    where: { id: params.id }
  })

  if (!template || template.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
      where: { id: params.id, userId: user.id },
      data: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        variables: variables,
      }
    })

    return NextResponse.json(template)
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.template.delete({
      where: { id: params.id, userId: user.id }
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete or not found' }, { status: 400 })
  }
}
