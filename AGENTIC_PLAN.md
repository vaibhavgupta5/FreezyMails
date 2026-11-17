# FreezyMails Agentic Job-Hunt Plan

Goal: use FreezyMails as the system of record and the email engine for a job hunt that Claude Code drives through MCP. Claude finds roles and contacts from your resume and profile, groups them into role clusters, drafts and sends tailored email through the existing drip engine, helps with ATS forms (Greenhouse, Lever, Ashby), and logs everything in one pipeline.

---

## 1. How FreezyMails works today

**Stack:** Next.js 16 App Router, Prisma 5 on Postgres, Supabase auth (cookie session), `pg-boss` queue, Nodemailer or Gmail OAuth for sending, `imapflow` for replies, Gemini for drafts.

**Send path, end to end:**

1. A **Template** (subject, body with `{{vars}}` and fallbacks, base64 attachments) is chosen in the campaign wizard. Resumes can already be attached this way.
2. `POST /api/campaigns` ([route.ts](src/app/api/campaigns/route.ts)) creates a `Campaign` in a transaction with its `Recipient` rows. Each recipient's `dynamicData` JSON holds the merge fields plus the A/B variant ids picked by `assignStableBucket`.
3. The campaign goes `DRAFT` → `SCHEDULED` → `SENDING`. A GitHub Actions cron ([cron.yml](.github/workflows/cron.yml)) calls `/api/workers/scheduled`, `/send` and `/imap` every 8 minutes. The scheduler round-robins recipients across the campaign's email accounts and enqueues `send-email` jobs.
4. `distributeJobs` ([scheduling.ts](src/lib/scheduling.ts)) sets `startAfter` to a random time inside a 4-hour window (SLOW) or none (FAST).
5. `handleSendEmail` ([send-handler.ts](src/workers/send-handler.ts)) checks pause state and the suppression list, renders the template, wraps links for click tracking, adds the open pixel, sends, and writes `MailEvent` rows. Sequence steps (follow-ups) skip recipients who already replied.
6. IMAP polling and Gmail sync create `Reply` rows, which are classified (`INTERESTED`, `NOT_INTERESTED`, and so on) and shown in the inbox.
7. **Audience:** `MailingList` and `Contact` (with `customFields` JSON), CSV import, and a web extractor ([extractor.ts](src/lib/extractor.ts)) that finds emails on company pages.

**What this gives us for free:** multi-account rotation, warmup and health scoring, suppression, slow drip, follow-up sequences, reply tracking, A/B variants. Nothing about sending needs rebuilding.

**What it lacks for a job hunt:**

| Gap | Why it matters |
|---|---|
| No API auth except the Supabase cookie ([supabase.ts](src/lib/supabase.ts)) | Claude Code can't call anything. Needs API keys and an MCP route. |
| No concept of company, job, application, role cluster | Recipients only know "an email in a campaign". |
| No profile or document store | Nothing for Claude to draft from or fill forms with. |
| No job sourcing | Contacts are manual or one-page scrapes. |
| No per-day cap or global dedupe across campaigns | Dangerous when an agent can create campaigns. |
| ATS applications happen outside the app | Nothing records or verifies them. |

**Existing bugs and risks to fix first (found while reading):**

1. In `handleSendEmail` the `return` statements for "already replied" and "suppressed" sit **inside the `for (const job of jobs)` loop**. In a batch they exit the whole handler and the remaining jobs in that batch are dropped. These should be `continue`.
2. `/api/workers/scheduled` has its `CRON_SECRET` check **commented out** ([route.ts](src/app/api/workers/scheduled/route.ts)). Anyone who finds the URL can trigger sends. Enforce it before adding any agent access.
3. `dailyLimit` exists on `Campaign` but a cap across all campaigns per sending account is what protects deliverability. Add it (see Phase 2).

---

## 2. What is and isn't possible with Greenhouse, Lever and Ashby

Your question was whether Claude can apply on your behalf through them and have FreezyMails keep that data. Short answer: **FreezyMails can store and verify those applications, but cannot submit them through an API.**

- **Reading jobs is public.** Greenhouse, Lever and Ashby all expose public posting-board endpoints with no key (`boards-api.greenhouse.io/v1/boards/<slug>/jobs`, `api.lever.co/v0/postings/<slug>`, `api.ashbyhq.com/posting-api/job-board/<slug>`). These are the sourcing backbone.
- **Submitting is not open to candidates.** Ashby's `applicationForm.submit` needs an API key with `candidatesWrite` permission ([docs](https://developers.ashbyhq.com/docs/applicationformsubmit)), which only the employer has. Greenhouse's Job Board application POST and Lever's apply POST are also employer-keyed, from my knowledge of those APIs. My search did not confirm either, so check their official docs before relying on that. In practice a candidate applies through the hosted web form.
- **So Claude applies through the form in a browser** (Claude in Chrome or the built-in browser), using your saved profile. Greenhouse and Ashby forms use invisible reCAPTCHA. Lever shows a visible challenge. The `jobhunt` skill's experience is that Greenhouse and Ashby pass from an automated browser and Lever does not.
- **Recommended mode: fill, then you press Submit.** Both career-ops and the neonwatty job-apply plugin stop at the review page, and I'd copy that for any high-value role. Fully automatic submit can be an opt-in per cluster for low-stakes roles. It is your call, and the platform terms apply.
- **Division of labour (decided):** Claude Code does all ATS applying, in the browser. FreezyMails never fills or submits those forms and has no form-filling code. It only **records** where you applied.
- **What FreezyMails adds:**
  - A `log_application` tool that Claude calls after each form submission, recording company, role, ATS, resume used, answers given, and the confirmation URL.
  - **Automatic verification from receipts.** Greenhouse and Ashby send confirmation emails from `no-reply@…greenhouse-mail.io` and `no-reply@ashbyhq.com`. The existing IMAP/Gmail sync can match those to the logged application and flip it to `CONFIRMED`. This also detects silent failures.
  - A dedupe ledger so Claude never applies to the same posting twice, whether by form or email.
  - Later replies and rejections from the same company update the same application.

---

## 3. Target architecture

```
Claude Code (skills /fm-setup /fm-source /fm-draft /fm-apply /fm-review)
   │  MCP over streamable HTTP, Bearer API key
   ▼
FreezyMails  /api/mcp
   ├─ Profile + documents + facts        (new)
   ├─ Sources → JobPosting → scoring      (new)
   ├─ Clusters (role families)            (new)
   ├─ Contacts / Companies                (new, feeds MailingList)
   ├─ Applications + events (email + ATS) (new)
   └─ existing: templates, campaigns, pg-boss drip, inbox, health
   ▲
Browser (Claude in Chrome) for ATS forms, X reading, human-gated submit
```

The MCP server lives in the app (`/api/mcp`, using `mcp-handler`, version pinned) so Vercel and the workers stay the single source of truth. Every tool checks the same ownership rules the REST routes use.

---

## 4. Data model additions (Prisma)

```
Profile            userId, headline, location, workAuth, gradYear, salaryFloor, links(json),
                   excludedCompanies[], excludedKeywords[], autonomy(json)
ProfileDocument    profileId, kind(RESUME|COVER_LETTER|PORTFOLIO|OTHER), name, fileUrl,
                   extractedText, clusterId?, isDefault
ProfileFact        profileId, text, kind(SKILL|PROJECT|PR|EXPERIENCE|EDUCATION|METRIC),
                   sourceUrl, sourceDocId?, verified   -- what drafts may cite
GithubSnapshot     profileId, fetchedAt, externalMergedPrs(json by org), topRepos(json)

Cluster            userId, name ("AI Engineer"), slug, keywords[], titlePatterns[],
                   resumeDocId, coverLetterDocId?, templateId, mailingListId,
                   seniority, locations[], autoCampaign(bool), dailyCap
Company            userId, name, domain, atsType(GREENHOUSE|LEVER|ASHBY|OTHER|NONE), atsSlug,
                   careersUrl, doNotContact, notes, source
JobPosting         companyId, title, location, url, atsType, externalId, postedAt,
                   descriptionText, fitScore, fitReason, clusterId?, status, dedupeKey(unique)
Contact(existing)  + kind(HR|FOUNDER|GENERIC|RECRUITER), sourceUrl, verifiedAt, companyId?
Application        userId, jobPostingId?, companyId, clusterId, channel(EMAIL|ATS_FORM|MANUAL),
                   atsType, status, resumeDocId, recipientId?, confirmationUrl,
                   answers(json), notes, createdAt
ApplicationEvent   applicationId, type, at, meta   -- append-only
ApiKey             userId, name, hashedKey, scopes[], lastUsedAt, revokedAt
```

Statuses: `DISCOVERED → SHORTLISTED → DRAFTED → APPROVED → SENT/SUBMITTED → CONFIRMED → REPLIED → INTERVIEW → OFFER | REJECTED | GHOSTED(30d)`.

`Application.recipientId` ties email applications to the existing `Recipient`, so `MailEvent` (open, click, reply) feeds the pipeline with no new tracking code.

---

## 5. Setup: website first, Claude enhances

**Decided:** the base setup happens on the website. Claude's role is to enhance what you saved, not to replace the wizard.

- **Website wizard (required, done by you):** a first-run **Setup** flow in the app. Until it's complete, the MCP tools return "Setup incomplete: finish setup at <app>/setup" and refuse to source, draft or send. The `/fm-setup` skill checks `get_setup_status` first and, if the profile is empty, tells you to complete the website setup and stops.
- **Claude enhancement (after the website setup):** `/fm-setup` reads everything you saved and then, for your approval:
  - proposes clusters from your resumes and preferences,
  - extracts and tidies `ProfileFact` rows and flags weak or missing ones (no metrics, unclear dates, claims with no source),
  - checks resumes for ATS problems (for example dropped ligatures, tables),
  - cross-checks GitHub numbers against what the resumes claim,
  - tunes the cover-letter voice and cluster templates,
  - suggests exclusions and target companies.
  Every change is a proposal you accept in the app or in chat. Nothing is overwritten silently, and edits are versioned.

Website wizard steps:

1. **Upload resumes** (PDF or DOCX, several variants). Extract text, store the file and the text. Claude proposes which cluster each belongs to (AI, SDE, systems, and so on).
2. **Upload cover letters** and any writing samples. These set voice for drafts.
3. **GitHub username.** Fetch via the GitHub API and store a `GithubSnapshot`:
   - Merged PRs to repos you don't own, counted per org. Never use the profile headline number, which is often inflated by commits to your own repos.
   - Top repos, languages, and notable projects.
4. **Preferences:** roles, locations, relocation, internship vs full-time, salary floor, graduation year, companies or keywords to exclude, and autonomy level.
5. **Fact extraction.** The app (Gemini, already integrated) turns resumes and GitHub into `ProfileFact` rows, each with a source link. Drafts and form answers may only cite facts that exist here. This is career-ops' provenance rule, and it stops invented claims.
6. **You review and approve the fact list once.** Edits made later are versioned.

All later tools read from this store, so drafting an email, or Claude Code filling an ATS form, never starts from a blank context. A read tool `get_profile_bundle` returns the profile, facts, resume text and file links so Claude Code can attach the right resume and answer form questions.

---

## 6. Sourcing

**Jobs (structured, no auth):**
- Greenhouse, Lever and Ashby posting APIs for a growing watchlist of company slugs. Probe slugs for every company seen anywhere, which is a cheap way to find boards nobody listed.
- Curated GitHub lists for internships and new grad roles.
- YC Work at a Startup and other public boards.
- Hacker News "Who is hiring", read through the public Algolia API. Many posts include a direct application email, so this feeds both jobs and contacts.
- Re-run daily on a cron and dedupe by `dedupeKey`.

**Contacts (founder, company and HR emails):**
- Existing extractor on `/careers`, `/jobs`, `/contact`, `/about`, `/team` and the footer.
- Keep role addresses (`careers@`, `jobs@`, `hiring@`, `hr@`, `talent@`, `people@`) and founder addresses **only if published**. Store `sourceUrl` for each.
- Hiring posts on X that list an email or an apply link. The official API is pay-per-use ($0.005 per post read, from my search, so vendor-reported and worth re-checking). Third-party scrapers exist but may violate X's terms. Preferred route: Claude reads search results in **your own logged-in X session** in the browser, with queries like `"hiring" "ML engineer" "email me" -"not hiring"`, and only extracts emails that the post itself states.
- **Never guess addresses** from name patterns, run permutation tools, or harvest individuals' personal emails. Verify with an MX check (extend [validate.ts](src/lib/validate.ts)) and drop anything on the suppression list.

**Scoring:** Claude scores each posting against your facts and cluster definitions. Rank on skill fit, never pay (pay is a floor only). Hard filters: seniority, graduation-year eligibility, location, and the scam signals (URL shorteners, identical stipends, any "registration fee"). Record `fitReason` for every score so you can audit it.

---

## 7. Clusters

A **Cluster** is a role family with its own resume, cover letter, template, mailing list and daily cap. Defaults: AI Engineer, SDE/Backend, Full-stack, Systems/Infra, plus ones you add.

**Auto-create:** during setup Claude reads your resumes and facts and proposes clusters with keywords and title patterns. You confirm.

**Auto-maintain** (daily worker):
1. New `JobPosting` rows are assigned to the best-fit cluster (title patterns first, then an LLM judgement). Low-confidence ones go to an "Unassigned" review queue.
2. Contacts found for a company are added to that cluster's `MailingList` with `customFields` such as `companyName`, `roleTitle`, `whyFit`, `jobUrl`. These feed the template variables.
3. When a cluster has enough new approved contacts, a draft **Campaign** is created per batch using the cluster's template, resume attachment and sending accounts. Nothing sends until approved.
4. Clusters report stats: open and reply rate per cluster and per template variant. The existing A/B system picks winning subject lines automatically.
5. Cluster definitions drift over time. A weekly job proposes merging, splitting or retiring clusters based on which ones get replies, and asks you before changing.

---

## 8. Phases

**Phase 0: safety fixes (half a day).** Fix the `return`→`continue` bug in the send handler, enforce `CRON_SECRET` on the worker routes, add a global per-account daily cap and a cross-campaign "never email the same address twice" check.

**Phase 1: MCP foundation (1–2 days).** `ApiKey` model and Settings page. `getUserFromRequest()` accepting a cookie or a Bearer key. `/api/mcp` with read tools over what exists: accounts, templates, campaigns, stats, replies, lists. Setup note: `claude mcp add --transport http freezymails <url> --header "Authorization: Bearer …"`. Scope keys as read-only vs send.

**Phase 2: profile and website setup (done).** Models in section 4, document upload with text extraction, GitHub snapshot, fact extraction and review, and the website setup wizard with a completion gate. Then `get_setup_status` and the `/fm-setup` enhancement skill, which only works once the website setup is done.

**Phase 3: sourcing and clusters (done, except the daily worker and X/curated-list importers, which move to Phase 6).** Company and JobPosting models, ATS board fetchers, HN and curated-list importers, contact finder on the existing extractor, MX validation, scoring, cluster assignment, daily sourcing worker. MCP tools: `search_jobs`, `score_job`, `assign_cluster`, `find_contacts`, `list_clusters`.

**Phase 4: email applications at scale (2–3 days).** `draft_application_email` (job + cluster + facts → subject and body, with a Gemini or Claude call), approval queue, auto-built draft campaigns per cluster, `approve_batch`, daily cap and randomized gaps enforced in the worker. Reply classification updates the `Application`. Follow-up sequence per cluster.

**Phase 5: ATS application log (1–2 days).** Record-only. `Application` and `ApplicationEvent`, MCP tools `check_already_applied` (dedupe before Claude applies), `get_profile_bundle`, `log_application`, `update_application_status`, the receipt-email matcher on the IMAP/Gmail sync, and a manual-apply list generator for LinkedIn and anything needing judgement. No form-schema fetching or answer preparation lives in FreezyMails. Claude Code does the applying in the browser and the `/fm-apply` skill holds the rules (facts only, stop on unmapped required questions, honest answers on work authorization).

**Phase 6: pipeline UI and autonomy (2–3 days).** Pipeline board by status, Companies and Clusters pages, follow-up due list, ghosted detection at 30 days, audit log of every tool call, a global kill switch. Skills `/fm-source`, `/fm-draft`, `/fm-apply`, `/fm-review` and a scheduled daily loop that sources, scores and drafts, then pings you with an approval queue.

---

## 9. Autonomy tiers

| Action | Default |
|---|---|
| Source, score, cluster, draft, track | Automatic |
| First email to a new company | Needs your approval (batch approve) |
| Follow-ups inside an approved sequence | Automatic, within caps |
| ATS form: fill and verify (Claude Code, in the browser) | Automatic, then logged in FreezyMails |
| ATS form: press Submit | You, unless you enable auto-submit for a cluster |
| LinkedIn | Manual-apply list only. No automation. |
| Referral requests | You send them yourself |

---

## 10. Guardrails

- **Volume:** about 40–45 emails a day total, randomized 2.5–7 minute gaps, per-account warmup limits, one email per address ever, unsubscribe line, hard suppression list. Enforced in the worker, not only in prompts.
- **Prompt injection:** job posts, career pages and tweets are untrusted data. Tools never take a recipient from page text without a `sourceUrl` and your approval, and tool results are never treated as instructions.
- **Truthfulness:** drafts and form answers cite only verified `ProfileFact` rows. Required questions with no matching fact are left for you, never filled with a guess. Honesty questions (work authorization, relocation) are mapped explicitly.
- **Keys and data:** hashed API keys with scopes, resumes and profile data stored per user, use of the existing `encrypt.ts` for anything credential-like. No passwords or tokens are stored for ATS sites, and nothing handles CAPTCHAs.
- **Terms:** X scraping and ATS automation depend on each site's terms. Prefer official APIs and your own logged-in session, and keep a human on Submit for anything high-value.
- **Honest reporting:** the `/fm-review` summary reports verified counts only (sent vs confirmed vs replied), and lists exclusions and why.

---

## 11. Open decisions

Decided: Claude Code does all ATS applying and FreezyMails only records it. Website setup comes first, and Claude only enhances it.

1. Hosted on Vercel or local only for the MCP server? The plan assumes hosted with API keys.
2. Internship or full-time, and which regions? This decides which sources to build first (India favors local boards and company sites; US boards have few junior roles).
3. Is ATS auto-submit ever allowed, or always you on the last click?
4. Gemini (already in the app) or Claude for drafting inside the server? Claude Code itself can draft over MCP with no server-side model, at the cost of needing a session running.
5. Which X approach: your own browser session, a paid scraper, or paste-in only?

---

## 12. Prior art consulted

- [career-ops](https://github.com/santifer/career-ops): skills as markdown modes, plain-text state, 1–5 fit scoring, provenance checks, never auto-submits.
- [neonwatty job-apply plugin](https://github.com/neonwatty/job-apply-plugin): visible-browser form fill, stops at review, append-only application log, single-claim lock.
- [ApplyPilot](https://github.com/ibarrajo/ApplyPilot) and [AIHawk](https://github.com/feder-cr/jobs_applier_ai_agent_aihawk): auto-apply approaches, with platform-terms risk.
- [mcp-handler](https://github.com/vercel/mcp-handler) and [Clerk's MCP guide](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server): MCP route patterns for Next.js. Verify the auth section for the version you install.
- [Ashby applicationForm.submit](https://developers.ashbyhq.com/docs/applicationformsubmit): confirms submission needs an employer API key.
