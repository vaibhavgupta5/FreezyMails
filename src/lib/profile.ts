import prisma from '@/lib/prisma'
import type { Profile } from '@prisma/client'

export const MAX_DOC_BYTES = 5 * 1024 * 1024
export const DOC_KINDS = ['RESUME', 'COVER_LETTER', 'OTHER'] as const
export const FACT_KINDS = ['SKILL', 'PROJECT', 'PR', 'EXPERIENCE', 'EDUCATION', 'METRIC', 'OTHER'] as const
export const FACT_STATUSES = ['PROPOSED', 'APPROVED', 'REJECTED'] as const

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  return prisma.profile.upsert({ where: { userId }, update: {}, create: { userId } })
}

export async function extractText(buffer: Buffer, mimeType: string, name: string): Promise<string> {
  const lower = name.toLowerCase()
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const { extractText: pdfText } = await import('unpdf')
    const { text } = await pdfText(new Uint8Array(buffer), { mergePages: true })
    return text.trim()
  }
  if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer })
    return value.trim()
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md') || mimeType.startsWith('text/')) {
    return buffer.toString('utf8').trim()
  }
  throw new Error('Unsupported file type. Use PDF, DOCX, TXT or MD.')
}

// Dropped ligatures ("profiling" -> "proling") make ATS keyword search fail silently.
const BROKEN_LIGATURE = /\b(oine|proling|specic|ows|rst|dierent|conguration|ecient|ective|scal|workow|eld|nal|signicant|identied|certied)\b/gi

export function detectResumeIssues(text: string): string[] {
  const issues: string[] = []
  const hits = [...new Set((text.match(BROKEN_LIGATURE) ?? []).map((w) => w.toLowerCase()))]
  if (hits.length > 0) {
    issues.push(
      `Text extraction shows dropped "fi/fl" ligatures (${hits.slice(0, 5).join(', ')}). ATS keyword matching may fail. Rebuild the PDF with embedded text mapping (for LaTeX, \\usepackage{cmap}).`,
    )
  }
  if (text.length < 300) issues.push('Very little text could be extracted. The file may be scanned images, which ATS cannot read.')
  return issues
}

export interface SetupStatus {
  complete: boolean
  steps: {
    basics: boolean
    resume: boolean
    github: boolean // optional
    facts: boolean
  }
  missing: string[]
  counts: { resumes: number; coverLetters: number; approvedFacts: number; proposedFacts: number }
}

export async function computeSetupStatus(userId: string): Promise<SetupStatus> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { githubSnapshot: { select: { id: true } } },
  })
  if (!profile) {
    return {
      complete: false,
      steps: { basics: false, resume: false, github: false, facts: false },
      missing: ['Profile basics', 'At least one resume', 'At least one approved fact'],
      counts: { resumes: 0, coverLetters: 0, approvedFacts: 0, proposedFacts: 0 },
    }
  }

  const [docs, facts] = await Promise.all([
    prisma.profileDocument.groupBy({
      by: ['kind'],
      where: { profileId: profile.id, extractedText: { not: '' } },
      _count: { _all: true },
    }),
    prisma.profileFact.groupBy({ by: ['status'], where: { profileId: profile.id }, _count: { _all: true } }),
  ])
  const countDocs = (k: string) => docs.find((d) => d.kind === k)?._count._all ?? 0
  const countFacts = (s: string) => facts.find((f) => f.status === s)?._count._all ?? 0

  const counts = {
    resumes: countDocs('RESUME'),
    coverLetters: countDocs('COVER_LETTER'),
    approvedFacts: countFacts('APPROVED'),
    proposedFacts: countFacts('PROPOSED'),
  }
  const steps = {
    basics: Boolean(profile.location?.trim()) && profile.targetRoles.length > 0,
    resume: counts.resumes > 0,
    github: Boolean(profile.githubSnapshot),
    facts: counts.approvedFacts > 0,
  }

  const missing: string[] = []
  if (!steps.basics) missing.push('Profile basics (location and at least one target role)')
  if (!steps.resume) missing.push('At least one resume with extractable text')
  if (!steps.facts) missing.push('At least one approved fact')

  return { complete: missing.length === 0 && Boolean(profile.setupCompletedAt), steps, missing, counts }
}
