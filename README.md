# FreezyMails

Production-grade automated cold email engine and outreach platform with deliverability safeguards, multi-account rotation, humanized drip pacing, sheet-style audience management, multivariate A/B testing, and a unified inbox.

---

## Table of Contents

- [Overview](#overview)
- [Why FreezyMails?](#why-freezymails)
- [The 7-Step Outreach Workflow](#the-7-step-outreach-workflow)
- [System Architecture & Flow Diagrams](#system-architecture--flow-diagrams)
- [Core Feature Deep Dive](#core-feature-deep-dive)
- [Production & Engineering Highlights](#production--engineering-highlights)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Running the Background Queue Worker](#running-the-background-queue-worker)
- [License](#license)

---

## Overview

Applying for jobs through conventional job portals or firing unmonitored mass emails often leads to unanswered applications, ATS black holes, or flagged domain reputations. 

FreezyMails is built to bypass gatekeepers and deliver cold outreach directly into the founder or hiring decision-maker's inbox. By combining automated web lead extraction, multi-account identity rotation, humanized slow-drip dispatching, and template variable fallbacks, FreezyMails ensures high email deliverability while managing all incoming responses in a single Unified Inbox.

---

## Why FreezyMails?

Existing cold email tools charge steep per-seat monthly fees, lack integrated web scrapers, or trigger spam algorithms by sending aggressive automated bursts from a single account.

FreezyMails solves these challenges with an open-source, full-stack architecture:

- **Deliverability Protection**: Spreads campaign sending volume across multiple personal domains and Gmail accounts.
- **Humanized Delivery Pacing**: Delivers emails using randomized time delays over custom windows (e.g. 4 hours) to match human sending behavior.
- **Zero-Failure Template Rendering**: Supports variable fallbacks so missing contact data never results in broken syntax like `Hi {{firstName}},`.
- **Sheet-Style Contact Management**: Features an interactive contact table with dynamic custom columns, CSV importing, and inline editing.
- **Multivariate A/B Testing**: Tests subject line and body copy variations simultaneously to track actual open and reply conversions.
- **Unified Inbox (Unibox)**: Consolidates incoming responses from IMAP and Gmail API accounts into a single thread view.

---

## The 7-Step Outreach Workflow

1. **Connect Sending Accounts**: Link personal SMTP/IMAP or Google OAuth accounts to distribute sending volume across multiple sending identities.
2. **Build Audience**: Import contacts via CSV or use the built-in Web Contact Extractor to scrape emails and names directly from target company URLs.
3. **Compose Outreach Sequences**: Write templates using dynamic merge variables (`{{firstName}}`, `{{companyName}}`) with defined fallbacks.
4. **Configure A/B Pitch Testing**: Add alternative subject lines and template variants to measure which messaging angle yields the highest conversion.
5. **Set Pacing Schedule**: Select sending accounts, filter audience lists, and enable Slow Drip to randomize delivery across a custom time window.
6. **Execute Asynchronous Queue**: The PostgreSQL-backed `pg-boss` background worker handles throttled dispatches while tracking opens, clicks, and bounces.
7. **Manage Responses in Unibox**: Review incoming replies in the Unified Inbox drawer and respond directly to move conversations forward.

---

## System Architecture & Flow Diagrams

### System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI["Next.js 16 App Router (React 19)"]
        State["State Management (Zustand & TanStack Query)"]
    end

    subgraph API & Server Layer
        API["Next.js Route Handlers (/api/*)"]
        Auth["Supabase Auth (@supabase/ssr)"]
    end

    subgraph Data & Queue Layer
        DB[("PostgreSQL Database")]
        Prisma["Prisma ORM 5.22"]
        Boss["pg-boss Async Queue"]
    end

    subgraph Worker Runtime Process
        Worker["Worker Runtime (tsx src/workers/index.ts)"]
        SendHandler["Send Email Handler (Concurrency: 5)"]
        ImapHandler["IMAP Poll Handler (Concurrency: 2)"]
        GmailHandler["Gmail Sync Handler (Concurrency: 3)"]
    end

    subgraph External Infrastructure
        SMTP["SMTP / Gmail API Infrastructure"]
        Scraper["Cheerio Web Scraper Engine"]
        Gemini["Google Gemini AI (Copy Assistant)"]
    end

    UI -->|HTTP REST| API
    API --> Auth
    API -->|Scrape Target URLs| Scraper
    API -->|ORM Access| Prisma --> DB
    API -->|Enqueue Jobs| Boss --> DB
    Worker -->|Poll Queued Jobs| Boss
    Worker --> SendHandler
    Worker --> ImapHandler
    Worker --> GmailHandler

    SendHandler -->|IPV4 Socket Dispatch| SMTP
    ImapHandler & GmailHandler -->|Sync Inbound Mail| SMTP
    SendHandler & ImapHandler -->|Write MailEvent & Reply| Prisma
    API -->|Draft Copy| Gemini
```

### Campaign Execution & Slow Drip Dispatch Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Next.js API Route
    participant DB as PostgreSQL (Prisma)
    participant Boss as pg-boss Job Queue
    participant Worker as Worker Process
    participant Health as Health & Rate Limiter
    participant SMTP as SMTP / Gmail Provider

    User->>API: Launch Campaign (Pacing, Accounts, Audience)
    API->>DB: Set Campaign Status = SENDING
    API->>Boss: Enqueue JOB_SEND_EMAIL Job
    Boss->>Worker: Dispatch Job to Send Handler
    Worker->>Health: Evaluate Daily Sent Limit & Account Health Score
    alt Fast Drip Execution
        Worker->>SMTP: Dispatch Email Immediately via Rotated Account
    else Slow Drip Execution
        Worker->>Worker: Apply Randomized Window Delay (Up to 4 Hours)
        Worker->>SMTP: Dispatch Email After Randomized Delay
    end
    SMTP-->>Worker: Return Transport Success Response
    Worker->>DB: Record MailEvent (SENT) & Update Recipient Status (SENT)
```

---

## Core Feature Deep Dive

### 1. Web Contact Extractor & Web Scraper
Paste a list of target company domain URLs. FreezyMails uses Cheerio to parse page content, extract `mailto:` links, evaluate regular expression email patterns, and extract founder or HR names from page metadata. If the main domain lacks direct contact details, the scraper automatically inspects `/about`, `/team`, `/careers`, and `/contact` subpages.

### 2. Sheet-Style Audience Management & Dynamic Custom Columns
Manage contact lists in an interactive spreadsheet view (`src/app/(app)/audience/[id]/page.tsx`). Add arbitrary dynamic fields (e.g. `fundingRound`, `techStack`, `role`, `linkedinUrl`), edit values inline, import raw data via PapaParse, and filter recipients before pulling them into active campaigns.

### 3. Template Variable Parser with Fallbacks
The template parser (`src/lib/template-parser.ts`) processes double-curly variable tags while allowing default fallback values (`renderTemplate`). If a contact record is missing a specific attribute, default values ensure output renders as `Hi there,` instead of `Hi {{firstName}},`.

### 4. Multivariate A/B Pitch Testing
Split-test subject lines (`ABSubjectVariant`) and template bodies (`ABTemplateVariant`) simultaneously. Contacts are deterministically assigned across defined split percentages. Open rates, reply rates, and time-to-first-reply are logged per variant to establish statistical winners.

### 5. Multi-Account Rotation & Health Safeguards
Link multiple sending identities via SMTP/IMAP or Google OAuth. FreezyMails balances outbound volume across connected accounts, monitors health scores based on bounce and complaint signals, enforces daily sending thresholds, and auto-pauses campaigns if bounce limits are exceeded.

### 6. Humanized Delivery Pacing (Slow Drip)
Fast Drip queues batch messages for immediate processing. Slow Drip spreads delivery randomly over customizable time windows (e.g., 4 hours), mimicking human sending habits to avoid triggering automated ISP rate-limit filters.

### 7. Unified Inbox (Unibox)
Consolidates incoming email threads across all connected accounts into a single dashboard drawer (`src/app/(app)/inbox/page.tsx`). Real-time IMAP polling (`imapflow`) and Gmail API synchronization link replies directly to the corresponding recipient, account, and campaign.

### 8. Open, Click, and Compliance Tracking
Features 1x1 transparent tracking pixel injection for open detection (`/api/track/open/[mailEventId]`), link rewriting for click analytics (`wrapLinksForTracking`), and 1-click unsubscribe link generation (`/api/unsubscribe/[recipientId]`) backed by global suppression list filtering.

### 9. AI Copy Assistant
Integrates Google Gemini 2.5 Flash (`src/lib/gemini.ts`) to assist in generating outreach email copy, producing subject line ideas, and drafting contextual follow-up responses based on prospect replies.

---

## Production & Engineering Highlights

### Dual-Stack DNS & Undici Agent Network Fix
In Node 18+ container environments (Render, Railway, Vercel), default dual-stack DNS resolution prioritizes IPv6 (`verbatim`). On hosts without active IPv6 egress, this causes socket connection timeouts when connecting to SMTP ports or external APIs. 

FreezyMails resolves this in `src/workers/index.ts` by explicitly enforcing IPv4 resolution:
```typescript
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { setGlobalDispatcher, Agent } from 'undici';
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
```

### Decoupled Asynchronous Worker Architecture
Outbound mail queueing, IMAP inbox polling, and Gmail API synchronization are decoupled from the main HTTP API server. Built on `pg-boss` (PostgreSQL job queue), background tasks run in a dedicated worker process (`src/workers/index.ts`) with isolated concurrency boundaries:
- `JOB_SEND_EMAIL`: Concurrency 5
- `JOB_POLL_IMAP`: Concurrency 2
- `JOB_SYNC_GMAIL`: Concurrency 3

### Database Indexing & ORM Performance
The PostgreSQL database schema (`prisma/schema.prisma`) includes compound indexes on frequent query paths to prevent full-table scans during heavy job execution:
- `@@index([userId])`
- `@@index([status, scheduledAt])`
- `@@index([campaignId, status])`
- `@@index([campaignId, type])`
- `@@index([recipientId, type])`
- `@@index([campaignId, stepIndex])`
- `@@unique([userId, email])`
- `@@unique([mailingListId, email])`

### AES-256 GCM Credential Encryption
Sensitive SMTP/IMAP credentials and OAuth refresh tokens are encrypted at rest using AES-256 GCM (`src/lib/encrypt.ts`) before being stored in the database.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Component Library**: React 19, Tailwind CSS v4, Radix UI, Headless UI, Framer Motion, Tremor, Recharts
- **Database & Data Layer**: PostgreSQL, Prisma ORM 5.22
- **Background Queue**: `pg-boss`
- **Authentication**: Supabase Auth (`@supabase/ssr`)
- **Mail Protocol Libraries**: Nodemailer, ImapFlow, Mailparser, Google Auth Library
- **Scraper Engine**: Cheerio, Undici
- **AI Services**: Google Generative AI (`@google/generative-ai`)
- **State Management**: TanStack React Query v5, Zustand

---

## Repository Structure

```
freezymails/
├── prisma/
│   └── schema.prisma         # PostgreSQL schema definition & models
├── src/
│   ├── app/                  # Next.js App Router (Pages & API routes)
│   │   ├── (app)/            # Authenticated application dashboard pages
│   │   │   ├── accounts/     # Sending account management & health scores
│   │   │   ├── analytics/    # Open, click, and reply performance charts
│   │   │   ├── audience/     # Contact list table with dynamic custom columns
│   │   │   ├── campaigns/    # Campaign builder, A/B testing & sequence setup
│   │   │   ├── dashboard/    # Main metrics overview
│   │   │   ├── inbox/        # Unified Inbox (Unibox)
│   │   │   ├── sent-mails/   # Logged mail dispatches
│   │   │   ├── settings/     # User profile & global preferences
│   │   │   └── templates/    # Reusable cold email template manager
│   │   ├── (auth)/           # Authentication pages (Login, Sign-up)
│   │   ├── api/              # HTTP REST API route handlers
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Global styles & Tailwind CSS v4 design tokens
│   ├── components/           # Reusable UI component library
│   ├── lib/                  # Core utility services & integrations
│   │   ├── encrypt.ts        # AES-256 credential encryption
│   │   ├── gemini.ts         # Google Gemini AI copy assistant
│   │   ├── imap.ts           # IMAP engine & inbox sync logic
│   │   ├── mailer.ts         # Nodemailer SMTP transport handler
│   │   ├── queue.ts          # pg-boss queue instance configuration
│   │   ├── template-parser.ts# Merge tag parser with variable fallbacks
│   │   └── domain-health.ts  # Account health score & bounce safeguards
│   └── workers/              # Standalone background worker process
│       ├── index.ts          # Worker entry point & network initialization
│       ├── send-handler.ts   # Campaign email dispatch handler
│       ├── imap-handler.ts   # IMAP inbox sync handler
│       └── gmail-sync-handler.ts # Gmail API inbox sync handler
├── .env.example              # Environment variables template
├── package.json              # Project dependencies & scripts
└── README.md                 # Project documentation
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure the following parameters:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/freezymails?schema=public"

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Google OAuth Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Application URL & Environment
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Security & Encryption
SMTP_ENCRYPTION_KEY="your-32-character-secret-encryption-key"
CRON_SECRET="your-cron-secret-token"

# AI Integration
GEMINI_API_KEY="your-google-gemini-api-key"
```

---

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- PostgreSQL database instance
- Supabase account for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vaibhavgupta5/FreezyMails.git
   cd FreezyMails
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Push the database schema:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running the Background Queue Worker

Campaign email sending, IMAP polling, and Gmail syncing require the `pg-boss` background worker process to be active.

Run the worker process in a separate terminal during development:

```bash
npm run worker
```

For production deployments, run the worker as a background process using Docker, PM2, or systemd:

```bash
npx tsx --env-file=.env src/workers/index.ts
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.

## Development workflow

```bash
npm ci                 # also installs the git hooks (husky)
npm run dev            # http://localhost:3000
npm run worker         # pg-boss worker (sending, IMAP and Gmail sync)
npm run check          # lint + typecheck + tests, the same as CI
```

Git hooks (husky):

| Hook | Runs |
|---|---|
| pre-commit | `lint-staged` (eslint on staged files, `prisma format` on the schema) |
| commit-msg | `commitlint`, Conventional Commits (`feat:`, `fix:`, `chore:` ...) |
| pre-push | `npm run typecheck && npm test` |

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request: Prisma validate and format check, lint, typecheck, tests with coverage, `next build`, conventional-commit check on PRs, and Docker builds of both images with a health-check smoke test. `security.yml` runs `npm audit`, gitleaks and CodeQL weekly and on PRs. Dependabot keeps npm, Actions and Docker up to date.

## Docker

One `Dockerfile`, two targets: `web` (Next.js, port 3000) and `worker` (pg-boss worker).

```bash
cp .env.example .env            # fill in Supabase, Google, keys
docker compose up --build       # web + worker against the DATABASE_URL in .env

# or against a local Postgres whose schema is pushed automatically:
docker compose -f docker-compose.yml -f docker-compose.localdb.yml up --build
```

`NEXT_PUBLIC_*` values are baked into the browser bundle at build time, so set them in `.env` before building. The web image exposes `/api/healthz`.
