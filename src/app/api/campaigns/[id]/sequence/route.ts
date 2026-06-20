import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id, userId: user.id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const steps = await prisma.sequenceStep.findMany({ where: { campaignId: params.id }, orderBy: { stepIndex: 'asc' } })
  return NextResponse.json(steps)
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id, userId: user.id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { stepIndex, delayDays, subject, body } = await request.json()
  const step = await prisma.sequenceStep.create({ data: { campaignId: params.id, stepIndex, delayDays: delayDays || 3, subject, body } })
  return NextResponse.json(step)
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id, userId: user.id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { stepId } = await request.json()
  await prisma.sequenceStep.delete({ where: { id: stepId } })
  return NextResponse.json({ success: true })
}
