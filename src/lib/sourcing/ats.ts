// Public job-board read APIs. No keys, no login, no scraping.
export type AtsKind = 'greenhouse' | 'lever' | 'ashby'

export interface RawJob {
  externalId: string
  title: string
  location: string | null
  isRemote: boolean
  url: string
  description: string
  postedAt: Date | null
}

export const ATS_KINDS: AtsKind[] = ['greenhouse', 'lever', 'ashby']

const MAX_DESC = 6000

function text(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h\d|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, MAX_DESC)
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (res.status === 404) throw new Error('Board not found. Check the slug.')
  if (!res.ok) throw new Error(`Board request failed (HTTP ${res.status})`)
  return res.json()
}

const REMOTE = /\bremote\b|work from home|anywhere/i
const asDate = (v: unknown) => {
  if (typeof v === 'number') return new Date(v)
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d }
  return null
}

interface GhJob { id: number; title: string; absolute_url: string; updated_at?: string; location?: { name?: string }; content?: string }
interface LeverJob { id: string; text: string; hostedUrl: string; createdAt?: number; categories?: { location?: string; allLocations?: string[] }; workplaceType?: string; descriptionPlain?: string }
interface AshbyJob { id: string; title: string; jobUrl: string; publishedAt?: string; location?: string; isRemote?: boolean; descriptionPlain?: string; descriptionHtml?: string; isListed?: boolean }

export async function fetchBoard(kind: AtsKind, slug: string): Promise<{ companyName: string | null; jobs: RawJob[] }> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$/.test(slug)) throw new Error('Invalid board slug')
  const s = encodeURIComponent(slug)

  if (kind === 'greenhouse') {
    const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`)) as { jobs: GhJob[] }
    return {
      companyName: null,
      jobs: data.jobs.map((j) => ({
        externalId: String(j.id), title: j.title, location: j.location?.name ?? null,
        isRemote: REMOTE.test(j.location?.name ?? ''), url: j.absolute_url,
        description: text(j.content), postedAt: asDate(j.updated_at),
      })),
    }
  }
  if (kind === 'lever') {
    const data = (await getJson(`https://api.lever.co/v0/postings/${s}?mode=json`)) as LeverJob[]
    return {
      companyName: null,
      jobs: data.map((j) => {
        const loc = j.categories?.allLocations?.join(' / ') || j.categories?.location || null
        return {
          externalId: j.id, title: j.text, location: loc,
          isRemote: j.workplaceType === 'remote' || REMOTE.test(loc ?? ''), url: j.hostedUrl,
          description: (j.descriptionPlain ?? '').slice(0, MAX_DESC), postedAt: asDate(j.createdAt),
        }
      }),
    }
  }
  const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${s}`)) as { jobs: AshbyJob[] }
  return {
    companyName: null,
    jobs: data.jobs.filter((j) => j.isListed !== false).map((j) => ({
      externalId: j.id, title: j.title, location: j.location ?? null,
      isRemote: Boolean(j.isRemote) || REMOTE.test(j.location ?? ''), url: j.jobUrl,
      description: (j.descriptionPlain ?? text(j.descriptionHtml)).slice(0, MAX_DESC), postedAt: asDate(j.publishedAt),
    })),
  }
}

/** Pulls a board kind and slug out of a careers URL, e.g. https://boards.greenhouse.io/acme or jobs.lever.co/acme. */
export function parseBoardUrl(input: string): { kind: AtsKind; slug: string } | null {
  let u: URL
  try { u = new URL(input.startsWith('http') ? input : `https://${input}`) } catch { return null }
  const host = u.hostname.replace(/^www\./, '')
  const first = u.pathname.split('/').filter(Boolean)[0]
  if (!first) return null
  if (/(^|\.)greenhouse\.io$/.test(host) && !host.startsWith('api')) return { kind: 'greenhouse', slug: first }
  if (host === 'jobs.lever.co') return { kind: 'lever', slug: first }
  if (host === 'jobs.ashbyhq.com') return { kind: 'ashby', slug: first }
  return null
}
