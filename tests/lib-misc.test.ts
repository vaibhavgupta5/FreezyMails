import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, API_KEY_PREFIX } from '@/lib/api-auth'
import { detectResumeIssues } from '@/lib/profile'
import { normalizeDomain } from '@/lib/sourcing/contacts'
import { isCareerEmail, isGenericEmail, isValidEmail } from '@/lib/extractor'
import { renderTemplate } from '@/lib/template-parser'

describe('api keys', () => {
  it('generates prefixed keys and stores only a hash', () => {
    const k = generateApiKey()
    expect(k.key.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(k.hashedKey).toBe(hashApiKey(k.key))
    expect(k.hashedKey).not.toContain(k.key)
    expect(generateApiKey().key).not.toBe(k.key)
  })
})

describe('detectResumeIssues', () => {
  it('flags dropped ligatures and near-empty extraction', () => {
    expect(detectResumeIssues('We improved proling of the oine service. '.repeat(20)).join(' ')).toMatch(/ligature/)
    expect(detectResumeIssues('tiny')).toHaveLength(1)
  })
  it('passes clean text', () => expect(detectResumeIssues('Built an offline profiling tool for the filesystem. '.repeat(20))).toEqual([]))
})

describe('normalizeDomain', () => {
  it('extracts a bare domain', () => {
    expect(normalizeDomain('https://www.Acme.com/careers')).toBe('acme.com')
    expect(normalizeDomain('acme.io')).toBe('acme.io')
  })
  it('rejects things that are not public domains', () => {
    expect(normalizeDomain('localhost')).toBeNull()
    expect(normalizeDomain('')).toBeNull()
  })
})

describe('email helpers', () => {
  it('validates and classifies', () => {
    expect(isValidEmail('jane@acme.com')).toBe(true)
    expect(isValidEmail('logo@2x.png')).toBe(false)
    expect(isCareerEmail('careers@acme.com')).toBe(true)
    expect(isGenericEmail('info@acme.com')).toBe(true)
    expect(isGenericEmail('jane@acme.com')).toBe(false)
  })
})

describe('renderTemplate', () => {
  it('fills variables, uses fallbacks and leaves unknown ones visible', () => {
    expect(renderTemplate('Hi {{name}} at {{co}} {{x}}', { name: 'Sam' }, { co: 'Acme' })).toBe('Hi Sam at Acme {{x}}')
  })
})
