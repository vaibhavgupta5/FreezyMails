import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBoard, parseBoardUrl } from '@/lib/sourcing/ats'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('parseBoardUrl', () => {
  it('recognises the three board hosts', () => {
    expect(parseBoardUrl('https://boards.greenhouse.io/acme')).toEqual({ kind: 'greenhouse', slug: 'acme' })
    expect(parseBoardUrl('job-boards.greenhouse.io/acme/jobs/1')).toEqual({ kind: 'greenhouse', slug: 'acme' })
    expect(parseBoardUrl('https://jobs.lever.co/acme/abc')).toEqual({ kind: 'lever', slug: 'acme' })
    expect(parseBoardUrl('https://jobs.ashbyhq.com/acme')).toEqual({ kind: 'ashby', slug: 'acme' })
  })
  it('rejects other hosts and garbage', () => {
    expect(parseBoardUrl('https://example.com/careers')).toBeNull()
    expect(parseBoardUrl('not a url at all')).toBeNull()
  })
})

describe('fetchBoard', () => {
  it('maps Greenhouse jobs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ jobs: [{ id: 7, title: 'Engineer', absolute_url: 'https://x/7', location: { name: 'Remote - US' }, content: '&lt;p&gt;Build things&lt;/p&gt;' }] })))
    const { jobs } = await fetchBoard('greenhouse', 'acme')
    expect(jobs[0]).toMatchObject({ externalId: '7', title: 'Engineer', isRemote: true })
    expect(jobs[0].description).toContain('Build things')
  })
  it('maps Lever and Ashby jobs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([{ id: 'a', text: 'SDE', hostedUrl: 'https://l/a', categories: { location: 'Pune' }, descriptionPlain: 'desc' }])))
    expect((await fetchBoard('lever', 'acme')).jobs[0]).toMatchObject({ externalId: 'a', title: 'SDE', location: 'Pune' })
    vi.stubGlobal('fetch', vi.fn(async () => json({ jobs: [{ id: 'b', title: 'ML', jobUrl: 'https://a/b', isRemote: true, descriptionPlain: 'd' }, { id: 'c', title: 'Hidden', jobUrl: 'u', isListed: false }] })))
    const ashby = await fetchBoard('ashby', 'acme')
    expect(ashby.jobs).toHaveLength(1)
    expect(ashby.jobs[0].isRemote).toBe(true)
  })
  it('reports a missing board and rejects bad slugs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 404)))
    await expect(fetchBoard('greenhouse', 'nope')).rejects.toThrow(/not found/i)
    await expect(fetchBoard('greenhouse', '../etc')).rejects.toThrow(/Invalid/)
  })
})
