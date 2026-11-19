import { describe, expect, it } from 'vitest'
import { checkDraftText, followUpsHash, plainToHtml } from '@/lib/agent'

const body = 'Hi team, I built a Rust job queue that handles 12k jobs per second and would love to help with your backend roadmap. Could we talk this week?'

describe('checkDraftText', () => {
  it('accepts a normal draft', () => expect(checkDraftText('Backend role', body)).toBeNull())
  it('rejects bad lengths', () => {
    expect(checkDraftText('x', body)).toMatch(/Subject/)
    expect(checkDraftText('Backend role', 'too short')).toMatch(/Body/)
  })
  it('rejects unresolved placeholders, many links and shorteners', () => {
    expect(checkDraftText('Hello {{name}}', body)).toMatch(/placeholder/)
    expect(checkDraftText('Backend role', `${body} https://a.com https://b.com https://c.com https://d.com`)).toMatch(/links/)
    expect(checkDraftText('Backend role', `${body} see https://bit.ly/abc`)).toMatch(/Shortened/)
  })
})

describe('plainToHtml', () => {
  it('escapes HTML, links URLs and splits paragraphs', () => {
    const html = plainToHtml('Hi <b>there</b>\n\nSee https://github.com/me.')
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('<a href="https://github.com/me">')
    expect(html.match(/<p>/g)).toHaveLength(2)
  })
})

describe('followUpsHash', () => {
  it('changes when the text changes', () => {
    const a = [{ delayDays: 3, subject: 's', body: 'b' }]
    expect(followUpsHash(a)).toBe(followUpsHash([...a]))
    expect(followUpsHash(a)).not.toBe(followUpsHash([{ ...a[0], body: 'changed' }]))
  })
})
