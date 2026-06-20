# FreezyMails — Complete Feature Audit & Growth Roadmap

## 1. What Exists Today (Full Inventory)

### Pages

| Page | What it does |
|---|---|
| `/` | Marketing landing page — hero, features list, no auth required |
| `/login` | Google OAuth only via Supabase |
| `/callback` | OAuth exchange → upsert User in DB → redirect to dashboard |
| `/dashboard` | KPI cards (sent today, open rate, reply rate, warm leads), activity feed ("Needs Attention"), campaign leaderboard, quick nav |
| `/campaigns` | Campaign list with search, status filter tabs, sort; per-campaign actions: Send, Pause, Resume, Duplicate, Edit, Delete, Resend Failed |
| `/campaigns/new` | 3-step wizard: (1) name + template + accounts, (2) CSV recipients with live validation, (3) A/B body + subject variants with AI subject generation |
| `/campaigns/[id]` | Full campaign detail: progress bar, per-recipient status table, A/B stats panel with "Pick Winner", inline name/daily-limit editing |
| `/campaigns/[id]/edit` | Edit draft campaign (re-opens wizard) |
| `/inbox` | Unified timeline of replies + sent emails merged; search; filter tabs (All/Unread/Received/Sent); reply drawer with AI suggestions, template snippets, send reply |
| `/analytics` | Aggregate KPIs (total sent, avg open rate, avg reply rate); trend bar chart (last 10 campaigns); sortable per-campaign performance table |
| `/accounts` | Connect Gmail (OAuth) or add SMTP+IMAP; account health score; test connection; disconnect |
| `/templates` | Template list (search, grid); create/edit with variable preview, file attachments, AI draft assist (Gemini) |
| `/settings` | Profile editing, default sender account, danger zone (delete campaigns, delete account) |

### Every API Route

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/google/login` | GET | OAuth redirect with PKCE state cookie |
| `/api/auth/google/callback` | GET | Exchange code → store encrypted tokens → create EmailAccount |
| `/api/accounts` | GET / POST | List / create (upsert by email) SMTP account with AES-256-GCM encrypted passwords |
| `/api/accounts/[id]` | DELETE | Remove account and cascade |
| `/api/accounts/[id]/health` | POST | Recompute health score from last 30 days of bounce/fail events |
| `/api/accounts/test` | POST | Test SMTP credentials via `transporter.verify()` — no DB write |
| `/api/campaigns` | POST | Create campaign + recipients + A/B variants in atomic transaction; assigns stable-hashed variant IDs per recipient |
| `/api/campaigns/[id]` | GET / PATCH / PUT / DELETE | CRUD; PATCH = name or dailyLimit only; PUT = full DRAFT rewrite |
| `/api/campaigns/[id]/progress` | GET | Returns sent/failed/pending/total counts |
| `/api/campaigns/[id]/recipients` | GET | All recipients for campaign |
| `/api/campaigns/[id]/pause` | POST | Status → PAUSED |
| `/api/campaigns/[id]/resume` | POST | Re-queues all PENDING recipients into pg-boss; status → SENDING |
| `/api/campaigns/[id]/duplicate` | POST | Copy campaign as DRAFT, no recipients copied |
| `/api/campaigns/[id]/resend` | POST | Reset FAILED/BOUNCED (or all) to PENDING; status → DRAFT |
| `/api/campaigns/[id]/ab-winner` | POST | Manually set winning variant; re-assigns remaining PENDING recipients |
| `/api/send/[campaignId]` | POST | Rate-limited dispatch: calculates per-account daily quota (Gmail 50/day, SMTP 200/day × `warmupDay × 25`), inserts staggered pg-boss jobs |
| `/api/replies` | GET | Merged list: Reply records + SENT MailEvents (200 each, sorted by date), renders A/B variants for sent events |
| `/api/replies/[id]` | GET / PATCH | Fetch one reply; update `isRead` / `isFlagged` |
| `/api/replies/[id]/respond` | POST | Send reply via SMTP or Gmail API; marks `repliedAt` |
| `/api/replies/sync` | POST | Trigger immediate IMAP poll for all active accounts |
| `/api/templates` | GET / POST | List / create templates; auto-extracts `{{var}}` tokens |
| `/api/templates/[id]` | GET / PUT / DELETE | Template CRUD |
| `/api/gemini/draft` | POST | `{ industry, goal, tone }` → Gemini returns `{ subject, body }` |
| `/api/gemini/reply` | POST | `{ originalEmail, replyReceived }` → 3 reply starter chips |
| `/api/gemini/subjects` | POST | `{ subject, count }` → N alternative subject lines |
| `/api/track/open/[recipientId]` | GET | 1×1 GIF; creates OPENED MailEvent; increments A/B variant `openCount` |
| `/api/gmail/webhook` | POST | Google Pub/Sub push — decodes payload, enqueues `JOB_SYNC_GMAIL` (10s dedup singleton) |
| `/api/workers/health` | POST | Cron: recomputes health for all active accounts |
| `/api/workers/imap` | POST | Cron: enqueues `JOB_POLL_IMAP` for all active accounts |
| `/api/workers/send` | POST | No-op; kept for Vercel cron compat |
| `/api/user` | PATCH / DELETE | Update name/defaultAccountId; delete campaigns or account |

### Background Workers (standalone Node process)

| Queue | Concurrency | What it does |
|---|---|---|
| `JOB_SEND_EMAIL` | 5 | Render template → inject open pixel → send via Gmail HTTP or Nodemailer → record SENT → auto-complete campaign |
| `JOB_POLL_IMAP` | 2 | Connect IMAP (OAuth or password) → match inbound to outbound via `In-Reply-To`/`References` or subject fallback → create Reply + REPLIED event → statistical A/B winner election (z-score, 95% confidence) |
| `JOB_SYNC_GMAIL` | — | **Registered in webhook route but NO handler registered in `workers/index.ts`. Dead code.** |

### Key Library Code

| File | Purpose |
|---|---|
| `lib/template-parser.ts` | `renderTemplate()` — replaces `{{key}}` tokens |
| `lib/encrypt.ts` | AES-256-GCM for SMTP/IMAP passwords and OAuth tokens |
| `lib/assignment.ts` | Stable consistent hashing — assigns recipients to A/B buckets deterministically |
| `lib/stats.ts` | Z-score + confidence interval for automatic A/B winner election |
| `lib/imap.ts` | `pollReplies()` — full IMAP polling + reply matching logic |
| `lib/mailer.ts` | `sendEmail()` — unified send for Gmail API or Nodemailer |
| `lib/health.ts` | Health score formula: –5 per bounce (cap –40), –2 per fail (cap –20), 0 if bounce rate >10% |

---

## 2. Gaps vs Competitors (Instantly / Smartlead / Lemlist)

### Critical — Product is incomplete without these

| # | Gap | Details | Who has it |
|---|---|---|---|
| 1 | **Follow-up Sequences** | Campaign is a single email. No multi-step drip. "If no reply after N days, send follow-up" is the core use case of every competitor. | Instantly, Smartlead, Lemlist |
| 2 | **Unsubscribe Link + Suppression List** | No opt-out mechanism. CAN-SPAM / GDPR legal requirement. No `/unsubscribe` page, no suppression model. | All competitors |
| 3 | **Click Tracking** | `CLICKED` MailEvent type exists in schema and Prisma enum but `/api/track/click/` route does not exist and `renderTemplate()` does not wrap links. | All competitors |
| 4 | **Bounce Auto-Detection** | `BOUNCED` Recipient status and MailEvent type exist but `imap-handler.ts` does not detect MAILER-DAEMON bounce messages. Bounces are silently ignored. | All competitors |
| 5 | **Gmail Pub/Sub Real-Time Sync** | `/api/gmail/webhook` route exists and enqueues `JOB_SYNC_GMAIL` but no worker handler for that queue is registered. Real-time Gmail push is wired but non-functional. | — (internal bug) |

### High Value — Expected by paying users

| # | Gap | Details | Who has it |
|---|---|---|---|
| 6 | **AI Reply Classification** | Keyword-based sentiment detection exists client-side in the inbox drawer (regex on "yes", "call", "unsubscribe"). Gemini is integrated but is not used to classify replies at ingest time. No server-side `classification` stored per reply. | Instantly, Smartlead |
| 7 | **Time-zone Aware Send Window** | `sendWindowStart/End` fields exist on Campaign model. No UI to set them. Worker sends emails at any hour. | Instantly, Smartlead |
| 8 | **Email Warmup Engine** | `warmupDay` field on EmailAccount is used in send quota formula but there is no warmup UI, no warmup job, no warmup email pool. | Instantly, Smartlead |
| 9 | **Domain Health Dashboard** | `healthScore` tracks bounce rate only. No SPF/DKIM/DMARC DNS validation. No blacklist check. | Smartlead |
| 10 | **Campaign Auto-Pause on Bounce Threshold** | Health score degrades but campaigns are not paused automatically when bounce rate exceeds a threshold. | Smartlead |
| 11 | **Send Test Email with Variable Preview** | No "send a test to myself" button in template editor or campaign wizard before launch. Easy to ship a broken `{{firstName}}` in production. | All competitors |
| 12 | **CSV Pre-validation & Suppression Check** | CSV is parsed client-side with basic format checks. No duplicate detection, no pre-check against suppression list, no validation summary before campaign creation. | Instantly, Smartlead |

### Nice-to-Have — Differentiation and growth

| # | Gap | Details | Who has it |
|---|---|---|---|
| 13 | **AI Full Sequence Writer** | Gemini drafts a single email. Competitors generate entire multi-step sequences from an ICP + offer prompt. | Instantly (Copilot) |
| 14 | **Webhook / Zapier Integration** | No outbound event delivery. Users can't push "reply received" or "email opened" events to HubSpot, Pipedrive, or Zapier. | Instantly, Smartlead |
| 15 | **Bulk Inbox Actions** | One reply at a time. No "mark all selected as read", bulk archive, or filter by classification. | Instantly (Unibox) |
| 16 | **Analytics Time-series Drill-Down** | Trend chart shows per-campaign aggregate bars. No per-day breakdown, no funnel (Sent → Opened → Clicked → Replied), no per-recipient drill-down. | Instantly |
| 17 | **Sending Schedule / Calendar** | `SCHEDULED` Campaign status exists in enum but no scheduling UI or cron dispatcher exists. | Instantly |
| 18 | **Team / Workspace Support** | Single-user only. No concept of org, workspace, or role. | Smartlead (white-label) |

---

## 3. Implementation Roadmap

### Phase 1 — Fix Broken Wiring + Legal Compliance (Week 1–2)

Low effort, high urgency. These are bugs or missing one-liners that make the product unsafe or incomplete.

#### 1.1 Fix Gmail Real-Time Push (`JOB_SYNC_GMAIL` handler)
- Register a `JOB_SYNC_GMAIL` worker in `src/workers/index.ts`.
- Handler logic: receive `{ accountId }`, call `pollReplies(account)` (reuse existing `imap-handler.ts` logic).
- **Impact**: Gmail users currently get replies only on scheduled IMAP poll, not in real-time.
- **Files**: `src/workers/index.ts`, `src/workers/imap-handler.ts`

#### 1.2 Click Tracking
- Create `src/app/api/track/click/[recipientId]/[encodedUrl]/route.ts`.
- Route decodes the URL, creates a `CLICKED` MailEvent (deduplicated), returns a 302 redirect.
- Update `src/lib/template-parser.ts`: during rendering, wrap `<a href="...">` links with the click-tracking URL.
- **Files**: new route, `src/lib/template-parser.ts`

#### 1.3 Bounce Auto-Detection in IMAP
- In `src/lib/imap.ts` (`pollReplies()`), add a detection pass before reply matching:
  - If sender is `MAILER-DAEMON`, `postmaster`, or contains `noreply@` and subject contains `Delivery Status`, `Undeliverable`, `Failed`, `Bounce`, classify as a bounce.
  - Extract the original recipient email from the bounce body (DSN format).
  - Update `Recipient.status = BOUNCED`, create `BOUNCED` MailEvent.
- **Files**: `src/lib/imap.ts`

#### 1.4 Unsubscribe Link + Suppression List
- **Schema**: Add `Suppression` model `{ id, userId, email, createdAt }`.
- Create `src/app/api/unsubscribe/[recipientId]/route.ts` (GET): add email to suppression, return a simple HTML confirmation page.
- In `src/lib/template-parser.ts`: auto-inject `{{unsubscribeLink}}` variable pointing to `/api/unsubscribe/[recipientId]` during send time (not at template save time, since recipientId is only known at send time).
- In `src/workers/send-handler.ts`: before sending, check suppression list — skip and mark recipient `FAILED` with reason "Unsubscribed".
- **Files**: `prisma/schema.prisma`, new route, `src/lib/template-parser.ts`, `src/workers/send-handler.ts`

---

### Phase 2 — Core Product Features (Weeks 3–7)

These turn FreezyMails from a "send once" tool into a real outreach platform.

#### 2.1 Follow-up Sequences

> [!IMPORTANT]
> This requires a schema change. Decide on the model before starting.

**Proposed schema additions**:
```prisma
model Sequence {
  id       String         @id @default(uuid())
  userId   String
  name     String
  steps    SequenceStep[]
  campaigns Campaign[]
  user     User           @relation(...)
}

model SequenceStep {
  id           String   @id @default(uuid())
  sequenceId   String
  stepIndex    Int
  delayDays    Int      // days after previous step
  subject      String
  body         String
  sequence     Sequence @relation(...)
}
```

- Campaign gets an optional `sequenceId` field. If set, single `templateId` is optional.
- **Worker change**: after `SENT` event, schedule a `JOB_SEND_FOLLOWUP` delayed job. Cancel if a `REPLIED` event arrives for that recipient before the delay.
- **UI**: Add a "Sequence" builder to the campaign wizard. Visual timeline with drag-to-reorder steps, delay pickers (1–30 days), per-step subject + body.
- **Files**: `prisma/schema.prisma`, `src/workers/send-handler.ts`, campaign wizard.

#### 2.2 AI Reply Classification
- Extend `src/app/api/gemini/reply/route.ts` or create a new `/api/gemini/classify` route.
- Prompt: given the email body, classify as one of `INTERESTED | NOT_INTERESTED | OOO | REFERRAL | FOLLOW_UP_LATER | OTHER`.
- Add `classification String?` to the `Reply` model in schema.
- In `src/lib/imap.ts`, after creating a Reply, enqueue a classification job (or run inline if fast enough).
- Replace the client-side regex keyword detection in the inbox drawer with the stored `classification` field.
- Add filter tabs in `/inbox`: All / Interested / Needs Reply / OOO.
- **Files**: `prisma/schema.prisma`, `src/lib/imap.ts`, `/api/gemini/classify/route.ts`, inbox components.

#### 2.3 Time-zone Aware Send Window UI
- Add `sendWindowStart Int?`, `sendWindowEnd Int?`, and `timezone String?` fields to Campaign (already have start/end, add timezone).
- Add UI controls in campaign wizard Step 1: "Send window" time range picker (0–23h) + timezone dropdown.
- In `src/app/api/send/[campaignId]/route.ts`: when computing job dispatch time, calculate the next valid send slot in the campaign timezone. Use `Intl.DateTimeFormat` or a lightweight tz library.
- **Files**: Campaign wizard, `/api/send/[campaignId]/route.ts`.

#### 2.4 Send Test Email
- Add `POST /api/templates/[id]/test` route: takes `{ recipientEmail, sampleData }`, renders template with sample data, sends via user's default account.
- Add a "Send Test" button in the template editor and campaign wizard preview step.
- A small modal asks for the test email address and lets the user override variable values.
- **Files**: new route, `src/app/(app)/templates/[id]/_components/`, campaign wizard.

#### 2.5 CSV Pre-Validation & Suppression Check
- In the campaign wizard Step 2, after CSV parse, run a server-side validation call `POST /api/campaigns/validate-recipients` before allowing "Next".
- Server-side checks: email format, deduplication within upload, cross-check against suppression list.
- Return a validation summary: `{ valid: n, invalid: [...], duplicates: [...], suppressed: [...] }`.
- Show a summary modal — "X emails are ready, Y were skipped" — user confirms before proceeding.
- **Files**: new API route, campaign wizard Step 2 component.

---

### Phase 3 — Deliverability & Growth (Weeks 8–11)

#### 3.1 Email Warmup Engine
This is the most complex and highest-value missing feature.

**Option A (Recommended for v1)**: Integrate with an existing warmup API (Mailreach or Warmup Inbox) — call their API to add/remove accounts from their warmup network. Lower engineering cost.

**Option B**: Build a peer warmup pool using FreezyMails' own user base — users opt in, accounts exchange warmup emails with each other. Higher trust, more complex.

**Scope for this phase (Option A)**:
- Add a "Warmup" toggle per account in `/accounts`.
- When enabled, call the warmup provider API to enroll the account.
- Show warmup progress: "Day X of 30", daily warmup sends, spam folder rescues.
- Expose `warmupDay` progression in the account card.
- **Files**: Accounts page UI, new `/api/accounts/[id]/warmup` route.

#### 3.2 Domain Health Dashboard
- Create `src/lib/domain-health.ts`:
  - SPF: DNS TXT lookup for `v=spf1` record on the domain.
  - DKIM: DNS TXT lookup for `default._domainkey.[domain]` (check for common selector).
  - DMARC: DNS TXT lookup for `_dmarc.[domain]`.
  - Blacklist: DNSBL query against Spamhaus (`[reversed-ip].zen.spamhaus.org`) — free, no API key.
- Add a "Domain Health" expandable panel per account in `/accounts`.
- Show green/amber/red status per check with explanatory tooltip.
- **Files**: `src/lib/domain-health.ts`, accounts page.

#### 3.3 Campaign Auto-Pause on Bounce Threshold
- Add `bounceThreshold Int @default(5)` to Campaign model (percentage).
- In `src/workers/send-handler.ts` and `src/lib/imap.ts`, after recording a BOUNCED event:
  - Count total sent and total bounced for the campaign.
  - If bounce rate exceeds `campaign.bounceThreshold`, set `Campaign.status = PAUSED`.
  - Create a system notification (store in a new `Notification` model or surface on next dashboard load).
- **Files**: `prisma/schema.prisma`, `src/workers/send-handler.ts`, `src/lib/imap.ts`.

#### 3.4 AI Full Sequence Writer
- New route `POST /api/gemini/sequence`.
- Input: `{ icp, offer, tone, steps: number }`.
- Prompt Gemini to return a JSON array of `{ subject, body }` objects for each step.
- In the campaign wizard Sequence builder: "AI Write Sequence" button that populates all steps.
- **Files**: new route, sequence builder UI.

---

### Phase 4 — Integrations & Polish (Weeks 12–15)

#### 4.1 Webhook Delivery
- **Schema**: `Webhook { id, userId, url, events: String[], secret, createdAt }`.
- On each MailEvent and Reply creation (in the worker and IMAP handler), POST a signed HMAC-SHA256 payload to matching webhooks.
- Build `/settings/webhooks` page: add URL, select event types, view delivery log, test-fire.
- This enables Zapier/Make integration without needing to build native CRM connectors.

#### 4.2 Analytics Drill-Down
- Add a per-day time-series endpoint: `GET /api/analytics/daily?range=30d`.
- Replace the campaign-aggregate bar chart with an area chart showing daily Sent / Opened / Clicked / Replied.
- Add a funnel visualization on the analytics page.
- Add per-recipient activity log inside `/campaigns/[id]` — clicking a recipient row expands its full MailEvent timeline.

#### 4.3 Bulk Inbox Actions
- Add checkboxes to the inbox list.
- Floating action bar appears when any are selected: "Mark Read", "Archive", "Flag".
- Filter bar with tabs: All / Unread / Interested / OOO / Flagged.
- Bulk PATCH endpoint: `PATCH /api/replies/bulk` with `{ ids[], action }`.

#### 4.4 Scheduled Campaign Dispatch
- Add a date/time picker in the campaign wizard ("Send now" vs "Schedule for…").
- Save `scheduledAt` to Campaign.
- Add a Vercel cron job `POST /api/workers/scheduled` that runs every 5 minutes, checks for campaigns with `status = SCHEDULED` and `scheduledAt <= now`, and triggers `/api/send/[campaignId]`.

---

## 4. Priority Matrix

| Feature | Impact | Effort | Phase |
|---|---|---|---|
| Fix Gmail Pub/Sub handler | High | XS | 1 |
| Click tracking | High | S | 1 |
| Bounce auto-detection | High | S | 1 |
| Unsubscribe + Suppression | High | M | 1 |
| Follow-up Sequences | Very High | XL | 2 |
| AI Reply Classification | High | S | 2 |
| Send Window UI (timezone) | Medium | S | 2 |
| Send Test Email | Medium | S | 2 |
| CSV pre-validation | Medium | S | 2 |
| Email Warmup (via API) | Very High | M | 3 |
| Domain Health Dashboard | Medium | M | 3 |
| Campaign Auto-Pause | Medium | S | 3 |
| AI Sequence Writer | High | M | 3 |
| Webhook Delivery | Medium | M | 4 |
| Analytics Drill-Down | Medium | M | 4 |
| Bulk Inbox Actions | Low | S | 4 |
| Scheduled Campaign | Medium | S | 4 |

---

## 5. Open Questions for Your Decision

> [!IMPORTANT]
> **Sequences Schema**: Should a Sequence be a reusable entity (create once, attach to multiple campaigns) or should sequence steps live directly on a Campaign? Reusable is more flexible but more complex to build.

> [!IMPORTANT]
> **Warmup Network**: Build a peer warmup pool using FreezyMails users (requires opt-in mechanism, complex coordination) or integrate with an existing provider API (Mailreach, Warmup Inbox) for v1?

> [!IMPORTANT]
> **Multi-tenancy**: The schema is single-user today. Is team/workspace support on the near-term roadmap? Adding it later is a painful migration — better to add an optional `workspaceId` to all models now as a placeholder.

> [!NOTE]
> **SCHEDULED Campaign status** already exists in the Prisma enum — the cron dispatcher just needs to be built. Low effort win for Phase 4.
