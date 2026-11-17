import dns from 'node:dns/promises'
import net from 'node:net'
import { deobfuscateHtml, isValidEmail, isCareerEmail, isGenericEmail } from '@/lib/extractor'

export type ContactKind = 'HR' | 'GENERIC' | 'PERSON'
export interface FoundContact { email: string; kind: ContactKind; sourceUrl: string; mxValid: boolean }

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const v = ip.toLowerCase()
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:')
}

/** Refuses hosts that resolve to private or loopback addresses, so a tool call can't probe the server's network. */
async function assertPublicHost(hostname: string) {
  if (net.isIP(hostname)) throw new Error('IP addresses are not allowed')
  const addrs = await dns.lookup(hostname, { all: true })
  if (addrs.length === 0 || addrs.some((a) => privateIp(a.address))) throw new Error('Host is not publicly routable')
}

export function normalizeDomain(input: string): string | null {
  try {
    const u = new URL(input.includes('://') ? input : `https://${input}`)
    const h = u.hostname.toLowerCase().replace(/^www\./, '')
    return /^[a-z0-9.-]+\.[a-z]{2,24}$/.test(h) ? h : null
  } catch { return null }
}

async function safeGet(url: string, hops = 3): Promise<string | null> {
  for (let i = 0; i <= hops; i++) {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    await assertPublicHost(u.hostname)
    const res = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreezyMailsBot/1.0)', Accept: 'text/html' },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location')!, url).toString(); continue }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
    return (await res.text()).slice(0, 1_500_000)
  }
  return null
}

export async function hasMx(domain: string): Promise<boolean> {
  try { return (await dns.resolveMx(domain)).length > 0 } catch { return false }
}

/** Finds addresses a company has itself published on its own site. Never guesses or generates addresses. */
export async function findPublishedContacts(domain: string): Promise<{ contacts: FoundContact[]; pagesChecked: string[] }> {
  const pages = ['/', '/contact', '/about', '/careers', '/jobs', '/team', '/company']
  const found = new Map<string, FoundContact>()
  const checked: string[] = []
  const mx = await hasMx(domain)

  for (const path of pages) {
    const url = `https://${domain}${path}`
    let html: string | null = null
    try { html = await safeGet(url) } catch { html = null }
    if (!html) continue
    checked.push(url)
    const clean = deobfuscateHtml(html)
    const emails = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) ?? []
    for (const raw of emails) {
      const email = raw.toLowerCase().replace(/[.,;:]$/, '')
      if (!isValidEmail(email) || found.has(email)) continue
      const edom = email.split('@')[1]
      if (edom !== domain && !edom.endsWith(`.${domain}`)) continue // only the company's own addresses
      const kind: ContactKind = isCareerEmail(email) ? 'HR' : isGenericEmail(email) || !/^[a-z]+([._][a-z]+)?$/.test(email.split('@')[0]) ? 'GENERIC' : 'PERSON'
      found.set(email, { email, kind, sourceUrl: url, mxValid: mx })
    }
  }
  return { contacts: Array.from(found.values()).slice(0, 30), pagesChecked: checked }
}
