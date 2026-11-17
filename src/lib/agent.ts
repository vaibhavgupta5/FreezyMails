import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'

export const DEFAULT_DAILY_CAP = 40
export const MAX_DAILY_CAP = 100
const GAP_MIN_S = 150 // 2.5 minutes
const GAP_MAX_S = 420 // 7 minutes

export interface FollowUp { delayDays: number; subject: string; body: string }

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://freezymails.vercel.app').replace(/\/$/, '')
}

export async function getAgentState(userId: string) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { agentPaused: true, preferences: true } })
  const prefs = (p?.preferences ?? {}) as Record<string, unknown>
  const cap = Math.min(MAX_DAILY_CAP, Math.max(1, Number(prefs.dailyOutreachCap) || DEFAULT_DAILY_CAP))
  return { paused: p?.agentPaused ?? false, dailyCap: cap }
}

export function plainToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const linked = esc(para.trim()).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>')
      return `<p>${linked}</p>`
    })
    .join('')
}

const FOOTER = '<p style="color:#888;font-size:12px">If you would rather not hear from me, <a href="{{unsubscribe_url}}">unsubscribe</a>.</p>'

export function followUpsHash(f: FollowUp[]): string {
  return Buffer.from(JSON.stringify(f.map((x) => [x.delayDays, x.subject, x.body]))).toString('base64').slice(0, 200)
}

/** Validates a draft before it is stored. Returns a message when something is wrong. */
export function checkDraftText(subject: string, body: string): string | null {
  if (subject.length < 3 || subject.length > 120) return 'Subject must be 3 to 120 characters'
  if (body.length < 50 || body.length > 2500) return 'Body must be 50 to 2500 characters'
  if (/{{|}}/.test(subject + body)) return 'Unresolved placeholder like {{name}} in the draft'
  if ((body.match(/https?:\/\//g) ?? []).length > 3) return 'At most 3 links allowed'
  if (/bit\.ly|rb\.gy|tinyurl|t\.co\//i.test(body)) return 'Shortened links are not allowed'
  return null
}

/** Has this address ever been emailed, suppressed or drafted by this user? Returns the reason, or null. */
export async function addressBlocked(userId: string, email: string, ignoreOutreachId?: string): Promise<string | null> {
  const e = email.toLowerCase()
  if (await prisma.suppression.findUnique({ where: { userId_email: { userId, email: e } } })) return 'Address is on your suppression list'
  if (await prisma.recipient.findFirst({ where: { email: e, campaign: { userId } }, select: { id: true } })) return 'You have already emailed this address'
  const dup = await prisma.outreach.findFirst({
    where: { userId, toEmail: e, status: { notIn: ['REJECTED', 'FAILED'] }, ...(ignoreOutreachId ? { id: { not: ignoreOutreachId } } : {}) },
    select: { id: true },
  })
  if (dup) return 'A draft for this address already exists'
  return null
}

/** Syncs Outreach and Application rows with what the send and reply machinery recorded. Cheap; call before reading. */
export async function reconcile(userId: string) {
  const queued = await prisma.outreach.findMany({ where: { userId, status: 'QUEUED', recipientId: { not: null } }, select: { id: true, recipientId: true, companyId: true, jobId: true, clusterId: true, subject: true, job: { select: { title: true, url: true } } } })
  if (queued.length > 0) {
    const recs = await prisma.recipient.findMany({ where: { id: { in: queued.map((q) => q.recipientId!) } }, select: { id: true, status: true, sentAt: true } })
    const byId = new Map(recs.map((r) => [r.id, r]))
    for (const q of queued) {
      const r = byId.get(q.recipientId!)
      if (!r) continue
      if (r.status === 'SENT') {
        const at = r.sentAt ?? new Date()
        await prisma.$transaction([
          prisma.outreach.update({ where: { id: q.id }, data: { status: 'SENT' } }),
          prisma.application.upsert({
            where: { outreachId: q.id },
            create: {
              userId, companyId: q.companyId, jobId: q.jobId, clusterId: q.clusterId, outreachId: q.id, channel: 'EMAIL', status: 'APPLIED',
              roleTitle: q.job?.title ?? null, url: q.job?.url ?? null, verified: true, evidence: 'Sent by FreezyMails', appliedAt: at,
              followUpAt: new Date(at.getTime() + 7 * 86400000), lastEventAt: at,
              events: { create: { type: 'EMAIL_SENT', note: q.subject, at } },
            },
            update: {},
          }),
        ])
      } else if (r.status === 'FAILED' || r.status === 'BOUNCED') {
        await prisma.outreach.update({ where: { id: q.id }, data: { status: 'FAILED' } })
      }
    }
  }

  const open = await prisma.application.findMany({ where: { userId, outreachId: { not: null }, status: 'APPLIED' }, select: { id: true, outreachId: true } })
  if (open.length > 0) {
    const outs = await prisma.outreach.findMany({ where: { id: { in: open.map((o) => o.outreachId!) } }, select: { id: true, recipientId: true } })
    const outById = new Map(outs.map((o) => [o.id, o.recipientId]))
    for (const a of open) {
      const rid = outById.get(a.outreachId!)
      if (!rid) continue
      const reply = await prisma.reply.findFirst({ where: { recipientId: rid }, orderBy: { receivedAt: 'desc' }, select: { classification: true, receivedAt: true, subject: true } })
      if (!reply || reply.classification === 'OUT_OF_OFFICE' || reply.classification === 'SPAM') continue
      const status = reply.classification === 'NOT_INTERESTED' ? 'REJECTED' : 'REPLIED'
      await prisma.application.update({
        where: { id: a.id },
        data: { status, lastEventAt: reply.receivedAt, events: { create: { type: `REPLY_${reply.classification ?? 'UNCLASSIFIED'}`, note: reply.subject.slice(0, 200), at: reply.receivedAt } } },
      })
    }
  }

  // No news for 30 days after applying: ghosted.
  await prisma.application.updateMany({
    where: { userId, status: 'APPLIED', lastEventAt: { lt: new Date(Date.now() - 30 * 86400000) } },
    data: { status: 'GHOSTED' },
  })
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export interface QueueResult { queued: number; skipped: Array<{ id: string; reason: string }>; remainingToday: number; campaigns: string[] }

/** Turns user-approved drafts into campaigns and pg-boss jobs, within the daily cap and per-account quotas. */
export async function queueApprovedOutreach(userId: string, opts: { accountIds?: string[]; max?: number } = {}): Promise<QueueResult> {
  const state = await getAgentState(userId)
  if (state.paused) throw new Error('The agent is paused (kill switch). Resume it on the Agent page first.')

  const accounts = await prisma.emailAccount.findMany({ where: { userId, isActive: true, ...(opts.accountIds ? { id: { in: opts.accountIds } } : {}) } })
  if (accounts.length === 0) throw new Error('No active email account to send from. Connect one on the Accounts page.')

  const sentToday = await prisma.outreach.count({ where: { userId, queuedAt: { gte: startOfToday() }, status: { in: ['QUEUED', 'SENT', 'FAILED'] } } })
  const remainingToday = Math.max(0, state.dailyCap - sentToday)
  if (remainingToday === 0) throw new Error(`Daily cap of ${state.dailyCap} reached. Try again tomorrow.`)

  const now = new Date()
  const quotas = accounts.map((a) => {
    const sameDay = a.dailySentResetAt && a.dailySentResetAt.toDateString() === now.toDateString()
    const used = sameDay ? a.dailySentCount : 0
    const limit = Math.min(a.provider === 'google' ? 50 : 200, a.warmupDay * 25)
    return { id: a.id, used, available: Math.max(0, limit - used), assigned: 0, nextAt: now.getTime() + Math.floor(Math.random() * 60000) }
  })
  const totalQuota = quotas.reduce((s, q) => s + q.available, 0)
  if (totalQuota === 0) throw new Error('Per-account daily limits are used up (warmup limits). Try again tomorrow.')

  const take = Math.min(remainingToday, totalQuota, opts.max ?? 100)
  const approved = await prisma.outreach.findMany({
    where: { userId, status: 'APPROVED' }, orderBy: { approvedAt: 'asc' }, take,
    include: { company: { select: { name: true } }, job: { select: { title: true } }, cluster: { select: { id: true, name: true, followUps: true, followUpsApprovedHash: true } } },
  })

  const skipped: QueueResult['skipped'] = []
  const ok: typeof approved = []
  for (const o of approved) {
    const why = await addressBlocked(userId, o.toEmail, o.id)
    if (why) { skipped.push({ id: o.id, reason: why }); await prisma.outreach.update({ where: { id: o.id }, data: { status: 'FAILED' } }); continue }
    ok.push(o)
  }

  const groups = new Map<string, typeof ok>()
  for (const o of ok) groups.set(o.clusterId ?? 'none', [...(groups.get(o.clusterId ?? 'none') ?? []), o])

  const { default: boss, JOB_SEND_EMAIL, startBoss } = await import('@/lib/queue')
  await startBoss()
  const base = appUrl()
  const campaigns: string[] = []
  let queued = 0

  for (const [, items] of groups) {
    const cluster = items[0].cluster
    const stamp = now.toISOString().slice(0, 16).replace('T', ' ')
    const template = await prisma.template.create({
      data: { userId, name: `Outreach ${cluster?.name ?? 'General'} ${stamp}`, subject: '{{subject}}', body: `{{body}}${FOOTER}`, variables: [{ name: 'subject' }, { name: 'body' }, { name: 'unsubscribe_url' }] },
    })
    const fu = ((cluster?.followUps as unknown as FollowUp[]) ?? [])
    const followUps = cluster && fu.length > 0 && cluster.followUpsApprovedHash === followUpsHash(fu) ? fu : []
    const campaign = await prisma.campaign.create({
      data: {
        userId, templateId: template.id, name: `Outreach: ${cluster?.name ?? 'General'} ${stamp}`, status: 'SENDING', pacingType: 'SLOW', dailyLimit: state.dailyCap,
        emailAccounts: { connect: accounts.map((a) => ({ id: a.id })) },
        sequenceSteps: { create: followUps.map((f, i) => ({ stepIndex: i, delayDays: f.delayDays, subject: f.subject, body: `${plainToHtml(f.body)}${FOOTER}` })) },
      },
    })
    campaigns.push(campaign.id)

    const jobs: Array<{ data: Record<string, unknown>; options: Record<string, unknown> }> = []
    for (const o of items) {
      const q = quotas.filter((x) => x.available - x.assigned > 0).sort((a, b) => a.nextAt - b.nextAt)[0]
      if (!q) { skipped.push({ id: o.id, reason: 'No account quota left today' }); continue }
      const rid = randomUUID()
      const firstName = (o.toName ?? '').split(' ')[0]
      await prisma.recipient.create({
        data: {
          id: rid, campaignId: campaign.id, email: o.toEmail,
          dynamicData: { subject: o.subject, body: plainToHtml(o.body), unsubscribe_url: `${base}/api/unsubscribe/${rid}`, company: o.company.name, role: o.job?.title ?? '', firstName: firstName || 'there' },
        },
      })
      await prisma.outreach.update({ where: { id: o.id }, data: { status: 'QUEUED', campaignId: campaign.id, recipientId: rid, queuedAt: new Date() } })
      jobs.push({ data: { recipientId: rid, campaignId: campaign.id, accountId: q.id, templateVariantId: null, subjectVariantId: null }, options: { retryLimit: 3, retryBackoff: true, startAfter: new Date(q.nextAt).toISOString() } })
      q.assigned++
      q.nextAt += (GAP_MIN_S + Math.random() * (GAP_MAX_S - GAP_MIN_S)) * 1000
      queued++
    }
    if (jobs.length > 0) await boss.insert(JOB_SEND_EMAIL, jobs)
  }

  await prisma.$transaction(quotas.filter((q) => q.assigned > 0).map((q) => prisma.emailAccount.update({ where: { id: q.id }, data: { dailySentCount: q.used + q.assigned, dailySentResetAt: now } })))
  return { queued, skipped, remainingToday: remainingToday - queued, campaigns }
}
