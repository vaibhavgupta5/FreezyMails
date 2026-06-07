import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(templates)
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await request.json()
    const data = templateSchema.parse(payload)

    // Extract dynamic variables like {{firstName}}
    const varRegex = /\{\{(.*?)\}\}/g
    const subjectVars = Array.from(data.subject.matchAll(varRegex)).map(m => m[1].trim())
    const bodyVars = Array.from(data.body.matchAll(varRegex)).map(m => m[1].trim())
    
    // Create an array of unique variables
    const variables = Array.from(new Set([...subjectVars, ...bodyVars]))

    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: data.name,
        subject: data.subject,
        body: data.body,
        variables: variables,
      }
    })

    return NextResponse.json(template)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
