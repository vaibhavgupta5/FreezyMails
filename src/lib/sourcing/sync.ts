import prisma from '@/lib/prisma'
import { fetchBoard, type AtsKind, type RawJob } from '@/lib/sourcing/ats'
import { scoreJob, type ScoreCluster, type ScoreProfile } from '@/lib/sourcing/score'

export interface ScoreContext { profile: ScoreProfile; clusters: ScoreCluster[] }

export async function loadScoreContext(userId: string): Promise<ScoreContext> {
  const [profile, clusters] = await Promise.all([
    prisma.profile.findUniqueOrThrow({
      where: { userId },
      select: { targetRoles: true, location: true, gradYear: true, excludedCompanies: true, excludedKeywords: true },
    }),
    prisma.cluster.findMany({ where: { userId, isActive: true }, select: { id: true, name: true, titleKeywords: true, excludeKeywords: true } }),
  ])
  return { profile, clusters }
}

export interface UpsertSummary { fetched: number; added: number; closed: number; topNew: Array<{ id: string; title: string; score: number }> }

/** Inserts new postings (scored), refreshes ones still listed, closes ones that disappeared. */
export async function upsertJobs(
  userId: string,
  company: { id: string; name: string },
  source: string,
  raws: RawJob[],
  ctx: ScoreContext,
  opts: { closeMissing: boolean },
): Promise<UpsertSummary> {
  const ids = raws.map((r) => r.externalId)
  const existing = await prisma.jobPosting.findMany({
    where: { userId, source, externalId: { in: ids } },
    select: { externalId: true },
  })
  const have = new Set(existing.map((e) => e.externalId))
  const now = new Date()

  if (have.size > 0) {
    await prisma.jobPosting.updateMany({
      where: { userId, source, externalId: { in: Array.from(have) } },
      data: { lastSeenAt: now, closedAt: null },
    })
  }

  const fresh = raws.filter((r) => !have.has(r.externalId))
  const rows = fresh.map((r) => {
    const s = scoreJob({ title: r.title, company: company.name, location: r.location, isRemote: r.isRemote, description: r.description }, ctx.profile, ctx.clusters)
    return {
      userId, companyId: company.id, clusterId: s.clusterId, source, externalId: r.externalId,
      title: r.title.slice(0, 300), location: r.location, isRemote: r.isRemote, url: r.url,
      description: r.description, postedAt: r.postedAt, score: s.score, scoreReasons: s.reasons,
      status: s.blocked ? 'DISMISSED' : 'NEW',
    }
  })
  for (let i = 0; i < rows.length; i += 200) {
    await prisma.jobPosting.createMany({ data: rows.slice(i, i + 200), skipDuplicates: true })
  }

  let closed = 0
  if (opts.closeMissing) {
    const res = await prisma.jobPosting.updateMany({
      where: { userId, companyId: company.id, source, closedAt: null, externalId: { notIn: ids } },
      data: { closedAt: now },
    })
    closed = res.count
  }

  const topNew = rows
    .filter((r) => r.status === 'NEW')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  const created = topNew.length
    ? await prisma.jobPosting.findMany({
        where: { userId, source, externalId: { in: topNew.map((t) => t.externalId) } },
        select: { id: true, title: true, score: true },
      })
    : []
  return {
    fetched: raws.length, added: fresh.length, closed,
    topNew: created.map((c) => ({ id: c.id, title: c.title, score: c.score ?? 0 })).sort((a, b) => b.score - a.score),
  }
}

export async function syncAtsCompany(userId: string, company: { id: string; name: string; atsKind: string | null; atsSlug: string | null }, ctx: ScoreContext) {
  if (!company.atsKind || !company.atsSlug) throw new Error('This company has no ATS board. Add it with a Greenhouse, Lever or Ashby slug.')
  const board = await fetchBoard(company.atsKind as AtsKind, company.atsSlug)
  const summary = await upsertJobs(userId, company, company.atsKind, board.jobs, ctx, { closeMissing: true })
  await prisma.company.update({ where: { id: company.id }, data: { lastSyncedAt: new Date() } })
  return summary
}

export async function rescoreAll(userId: string, ctx: ScoreContext): Promise<number> {
  const jobs = await prisma.jobPosting.findMany({
    where: { userId, closedAt: null, status: { in: ['NEW', 'DISMISSED'] } },
    select: { id: true, title: true, location: true, isRemote: true, description: true, status: true, company: { select: { name: true } } },
  })
  let n = 0
  for (let i = 0; i < jobs.length; i += 50) {
    await prisma.$transaction(
      jobs.slice(i, i + 50).map((j) => {
        const s = scoreJob({ title: j.title, company: j.company.name, location: j.location, isRemote: j.isRemote, description: j.description }, ctx.profile, ctx.clusters)
        n++
        return prisma.jobPosting.update({
          where: { id: j.id },
          data: { score: s.score, scoreReasons: s.reasons, clusterId: s.clusterId, ...(s.blocked ? { status: 'DISMISSED' } : {}) },
        })
      }),
    )
  }
  return n
}
