// "Ask HN: Who is hiring?" via the public Algolia API. Comments are untrusted text.
export interface HnPost {
  id: string
  author: string
  url: string
  text: string
  company: string
  emails: string[]
  applyUrls: string[]
  isRemote: boolean
  postedAt: Date | null
}

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g

function plain(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/gi, ' $1 ')
    .replace(/<p>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x2F;/g, '/').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/[ \t]+/g, ' ').trim()
}

export async function fetchHnHiring(opts: { monthsBack?: number; query?: string; limit?: number }): Promise<{ thread: string; posts: HnPost[] }> {
  const search = await fetch(
    'https://hn.algolia.com/api/v1/search_by_date?query=%22Ask%20HN%3A%20Who%20is%20hiring%22&tags=story,author_whoishiring&hitsPerPage=12',
    { signal: AbortSignal.timeout(20000) },
  ).then((r) => r.json())
  const stories = (search.hits as Array<{ objectID: string; title: string }>).filter((h) => /who is hiring/i.test(h.title) && !/freelancer|wants to be hired/i.test(h.title))
  const story = stories[Math.min(opts.monthsBack ?? 0, stories.length - 1)]
  if (!story) throw new Error('Could not find a Who is hiring thread')

  const item = await fetch(`https://hn.algolia.com/api/v1/items/${story.objectID}`, { signal: AbortSignal.timeout(30000) }).then((r) => r.json())
  const q = opts.query?.toLowerCase()
  const posts: HnPost[] = []
  for (const c of (item.children ?? []) as Array<{ id: number; author: string; text: string | null; created_at: string }>) {
    if (!c.text) continue
    const body = plain(c.text)
    if (q && !body.toLowerCase().includes(q)) continue
    const emails = Array.from(new Set((body.match(EMAIL) ?? []).map((e) => e.toLowerCase().replace(/[.,;:]$/, ''))))
    const applyUrls = Array.from(new Set(body.match(/https?:\/\/[^\s)>"']+/g) ?? [])).slice(0, 5)
    const company = body.split(/\n/)[0].split('|')[0].trim().slice(0, 80)
    posts.push({
      id: String(c.id), author: c.author, url: `https://news.ycombinator.com/item?id=${c.id}`,
      text: body.slice(0, 3000), company, emails, applyUrls,
      isRemote: /\bremote\b/i.test(body.slice(0, 300)), postedAt: new Date(c.created_at),
    })
    if (posts.length >= (opts.limit ?? 300)) break
  }
  return { thread: story.title, posts }
}
