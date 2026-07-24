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
      content: z.string().refine(
        (b64) => Buffer.byteLength(b64, "base64") <= 2 * 1024 * 1024,
        { message: "Each attachment must be 2 MB or smaller" },
      ),
      encoding: z.string().optional(),
      size: z.number().optional(),
    })
  ).optional(),
  variables: z.array(
    z.object({
      name: z.string(),
      fallback: z.string().optional()
    })
  ).optional(),
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
    const extractedVariables = Array.from(new Set([...subjectVars, ...bodyVars]))
    
    const variables = extractedVariables.map(v => {
      const existing = data.variables?.find(ev => ev.name === v);
      return {
        name: v,
        fallback: existing?.fallback || ""
      }
    });

    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: data.name,
        subject: data.subject,
        body: data.body,
        variables: variables,
        ...({ attachments: data.attachments || [] } as unknown as Record<string, unknown>),
      }
    })

    return NextResponse.json(template)
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}


export const dynamic = 'force-dynamic'
