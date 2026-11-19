import { describe, expect, it } from 'vitest'
import { scoreJob, type ScoreCluster, type ScoreProfile } from '@/lib/sourcing/score'

const profile: ScoreProfile = { targetRoles: ['AI Engineer'], location: 'India', gradYear: 2025, excludedCompanies: ['BadCorp'], excludedKeywords: ['clearance'] }
const clusters: ScoreCluster[] = [
  { id: 'ai', name: 'AI Engineer', titleKeywords: ['machine learning', 'ai engineer', 'llm'], excludeKeywords: [] },
  { id: 'sde', name: 'SDE', titleKeywords: ['software engineer', 'backend'], excludeKeywords: ['staff'] },
]
const job = (over: Partial<Parameters<typeof scoreJob>[0]> = {}) => ({ title: 'Software Engineer', company: 'Acme', location: 'Bengaluru, India', isRemote: false, description: '', ...over })
const now = new Date('2026-06-01')

describe('scoreJob', () => {
  it('assigns the matching cluster and rewards a title match', () => {
    const r = scoreJob(job({ title: 'Backend Software Engineer' }), profile, clusters, now)
    expect(r.clusterId).toBe('sde')
    expect(r.score).toBeGreaterThanOrEqual(60)
    expect(r.blocked).toBe(false)
  })

  it('blocks excluded companies and keywords', () => {
    expect(scoreJob(job({ company: 'BadCorp Inc' }), profile, clusters, now).blocked).toBe(true)
    expect(scoreJob(job({ description: 'Requires security clearance' }), profile, clusters, now).blocked).toBe(true)
  })

  it('blocks off-profile titles and scam markers', () => {
    expect(scoreJob(job({ title: 'Marketing Intern' }), profile, clusters, now).blocked).toBe(true)
    expect(scoreJob(job({ description: 'pay a registration fee to start' }), profile, clusters, now).blocked).toBe(true)
  })

  it('penalises senior titles for an early-career profile', () => {
    const junior = scoreJob(job({ title: 'Software Engineer' }), profile, clusters, now).score
    const senior = scoreJob(job({ title: 'Senior Software Engineer' }), profile, clusters, now).score
    expect(senior).toBeLessThan(junior - 20)
  })

  it('penalises a mismatched graduating class and large experience asks', () => {
    const base = scoreJob(job({ title: 'Software Engineer' }), profile, clusters, now).score
    expect(scoreJob(job({ description: 'Open to the class of 2027' }), profile, clusters, now).score).toBeLessThan(base)
    expect(scoreJob(job({ description: '8+ years of experience' }), profile, clusters, now).score).toBeLessThan(base)
  })

  it('does not give remote credit to a foreign-listed remote role', () => {
    const r = scoreJob(job({ isRemote: true, location: 'San Francisco' }), profile, clusters, now)
    expect(r.reasons.join(' ')).toMatch(/check you are eligible/)
  })

  it('respects cluster exclude keywords', () => {
    const r = scoreJob(job({ title: 'Staff Software Engineer' }), profile, clusters, now)
    expect(r.clusterId).toBeNull()
  })

  it('stays within 0 to 100', () => {
    const r = scoreJob(job({ title: 'Senior Principal Software Engineer', description: '15 years' }), profile, clusters, now)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })
})
