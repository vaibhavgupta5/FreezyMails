// Deterministic fit scoring. Explainable on purpose: every point has a reason the user can audit.
export interface ScoreProfile {
  targetRoles: string[]
  location: string | null
  gradYear: number | null
  excludedCompanies: string[]
  excludedKeywords: string[]
}
export interface ScoreCluster { id: string; name: string; titleKeywords: string[]; excludeKeywords: string[] }
export interface ScoreJob { title: string; company: string; location: string | null; isRemote: boolean; description: string }
export interface ScoreResult { score: number; reasons: string[]; clusterId: string | null; clusterName: string | null; blocked: boolean }

const JUNK = /wordpress|shopify|\bseo\b|content (writer|creator)|social media|telecall|data entry|\bsales\b|marketing|recruiter|accountant|customer support/i
const SENIOR = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of|architect|vp)\b/i
const JUNIOR = /\b(intern|internship|trainee|apprentice|new ?grad|graduate|entry[- ]level|junior|jr\.?|fresher|early career|associate)\b/i
const SCAM = /registration fee|training fee|security deposit|pay (a )?fee|bit\.ly|rb\.gy|tinyurl/i

const has = (hay: string, needle: string) => needle.trim() !== '' && hay.toLowerCase().includes(needle.trim().toLowerCase())

export function scoreJob(job: ScoreJob, profile: ScoreProfile, clusters: ScoreCluster[], now = new Date()): ScoreResult {
  const reasons: string[] = []
  const title = job.title
  const block = (why: string): ScoreResult => ({ score: 0, reasons: [why], clusterId: null, clusterName: null, blocked: true })

  if (profile.excludedCompanies.some((c) => has(job.company, c))) return block('Company is on your exclusion list')
  const badKw = profile.excludedKeywords.find((k) => has(title, k) || has(job.description, k))
  if (badKw) return block(`Contains excluded keyword "${badKw}"`)
  if (JUNK.test(title)) return block('Title looks off-profile (non-engineering)')
  if (SCAM.test(job.description)) return block('Possible scam: fee or shortened link in the description')

  let score = 20

  // Best cluster by title keyword hits.
  let best: { c: ScoreCluster; hits: number; descHits: number } | null = null
  for (const c of clusters) {
    if (c.excludeKeywords.some((k) => has(title, k))) continue
    const hits = c.titleKeywords.filter((k) => has(title, k)).length
    const descHits = c.titleKeywords.filter((k) => has(job.description, k)).length
    if (hits === 0 && descHits < 2) continue
    if (!best || hits * 3 + descHits > best.hits * 3 + best.descHits) best = { c, hits, descHits }
  }
  if (best) {
    if (best.hits > 0) {
      score += Math.min(60, 40 + (best.hits - 1) * 10)
      reasons.push(`Title matches cluster "${best.c.name}" (+${Math.min(60, 40 + (best.hits - 1) * 10)})`)
    }
    const d = Math.min(15, best.descHits * 5)
    if (d > 0) { score += d; reasons.push(`Description mentions ${best.descHits} cluster keyword(s) (+${d})`) }
  }

  const roleHit = profile.targetRoles.find((r) => has(title, r))
  if (roleHit) { score += 15; reasons.push(`Title matches your target role "${roleHit}" (+15)`) }
  if (!best && !roleHit) reasons.push('Title matches no cluster or target role')

  // Seniority vs career stage.
  const year = now.getFullYear()
  const exp = profile.gradYear ? Math.max(0, year - profile.gradYear) : null
  const early = exp !== null && exp <= 2
  if (SENIOR.test(title) && (exp === null || exp < 5)) { score -= 35; reasons.push('Senior-level title for your experience (-35)') }
  if (early && JUNIOR.test(title)) { score += 10; reasons.push('Early-career friendly title (+10)') }
  if (exp !== null) {
    const m = job.description.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)/i)
    if (m && Number(m[1]) > exp + 2) { score -= 25; reasons.push(`Asks ${m[1]}+ years, you have about ${exp} (-25)`) }
  }
  if (profile.gradYear) {
    const gy = job.description.match(/class of (20\d\d)|graduat\w+ (?:in|by|between)?\s*(20\d\d)/i)
    const wanted = gy ? Number(gy[1] ?? gy[2]) : null
    if (wanted && wanted !== profile.gradYear) { score -= 30; reasons.push(`Targets the ${wanted} graduating class, you are ${profile.gradYear} (-30)`) }
  }

  // Location.
  const locMatches = (loc: string) => (profile.location ?? '').split(/[,/]/).map((t) => t.trim()).filter(Boolean).some((t) => has(loc, t))
  if (job.isRemote && (!job.location || !profile.location || locMatches(job.location))) { score += 5; reasons.push('Remote (+5)') }
  else if (job.isRemote) reasons.push(`Remote but listed in "${job.location}": check you are eligible from ${profile.location}`)
  else if (profile.location && job.location) {
    const tokens = profile.location.split(/[,/]/).map((t) => t.trim()).filter(Boolean)
    if (tokens.some((t) => has(job.location!, t))) { score += 10; reasons.push('Location matches (+10)') }
    else { score -= 15; reasons.push(`Location "${job.location}" does not match "${profile.location}" (-15)`) }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    clusterId: best && best.hits > 0 ? best.c.id : null,
    clusterName: best && best.hits > 0 ? best.c.name : null,
    blocked: false,
  }
}
