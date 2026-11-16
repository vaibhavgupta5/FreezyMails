export interface GithubRepo {
  name: string
  url: string
  description: string | null
  language: string | null
  stars: number
  pushedAt: string
}

export interface GithubSnapshotData {
  username: string
  profileUrl: string
  name: string | null
  bio: string | null
  company: string | null
  publicRepos: number
  followers: number
  /** Merged PRs to repositories the user does not own. This is the number worth citing. */
  externalMergedPrs: {
    total: number
    byRepo: { repo: string; count: number; url: string }[]
    recent: { title: string; url: string; repo: string; mergedAt: string | null }[]
  }
  topRepos: GithubRepo[]
  languages: { language: string; repos: number }[]
}

const USERNAME_RE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/

export function isValidGithubUsername(name: string) {
  return USERNAME_RE.test(name)
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'freezymails-setup',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const res = await fetch(`https://api.github.com${path}`, { headers, cache: 'no-store' })
  if (res.status === 404) throw new Error('GitHub user not found')
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub rate limit reached. Try again in a minute, or set GITHUB_TOKEN.')
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`)
  return res.json() as Promise<T>
}

interface GhUser {
  login: string
  html_url: string
  name: string | null
  bio: string | null
  company: string | null
  public_repos: number
  followers: number
}
interface GhSearchItem {
  title: string
  html_url: string
  repository_url: string
  pull_request?: { merged_at: string | null }
}
interface GhRepo {
  name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  pushed_at: string
  fork: boolean
}

export async function fetchGithubSnapshot(username: string): Promise<GithubSnapshotData> {
  if (!isValidGithubUsername(username)) throw new Error('Invalid GitHub username')

  const user = await gh<GhUser>(`/users/${username}`)

  // Merged PRs to other people's repos. Excludes anything under the user's own account.
  const q = encodeURIComponent(`author:${user.login} is:pr is:merged -user:${user.login}`)
  const items: GhSearchItem[] = []
  let totalCount = 0
  for (let page = 1; page <= 3; page++) {
    const res = await gh<{ total_count: number; items: GhSearchItem[] }>(
      `/search/issues?q=${q}&per_page=100&page=${page}&sort=updated`,
    )
    totalCount = res.total_count
    items.push(...res.items)
    if (res.items.length < 100) break
  }

  const byRepoMap = new Map<string, number>()
  for (const i of items) {
    const repo = i.repository_url.split('/').slice(-2).join('/')
    byRepoMap.set(repo, (byRepoMap.get(repo) ?? 0) + 1)
  }
  const byRepo = [...byRepoMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([repo, count]) => ({
      repo,
      count,
      url: `https://github.com/${repo}/pulls?q=is%3Apr+author%3A${user.login}+is%3Amerged`,
    }))

  const repos = (await gh<GhRepo[]>(`/users/${user.login}/repos?sort=pushed&per_page=100&type=owner`)).filter(
    (r) => !r.fork,
  )
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }))

  const langMap = new Map<string, number>()
  for (const r of repos) if (r.language) langMap.set(r.language, (langMap.get(r.language) ?? 0) + 1)
  const languages = [...langMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([language, n]) => ({ language, repos: n }))

  return {
    username: user.login,
    profileUrl: user.html_url,
    name: user.name,
    bio: user.bio,
    company: user.company,
    publicRepos: user.public_repos,
    followers: user.followers,
    externalMergedPrs: {
      total: totalCount,
      byRepo: byRepo.slice(0, 25),
      recent: items.slice(0, 15).map((i) => ({
        title: i.title,
        url: i.html_url,
        repo: i.repository_url.split('/').slice(-2).join('/'),
        mergedAt: i.pull_request?.merged_at ?? null,
      })),
    },
    topRepos,
    languages,
  }
}
