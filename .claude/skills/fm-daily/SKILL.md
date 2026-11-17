---
name: fm-daily
description: The daily FreezyMails loop - refresh job boards, score, draft outreach for the best new roles and review the pipeline, then give the user one approval queue. Use for a scheduled or recurring run, or when the user says to run the daily job hunt.
---

# Daily loop

Run once per day, in this order. Stop early if the agent is paused or setup is incomplete.

1. **Refresh.** `list_companies`, `sync_company` for each board not synced today (the server cron also does this), `import_hn_hiring` for each cluster keyword on the first day of the month.
2. **Triage.** `search_jobs` with `minScore` 70 and status NEW. Dismiss misses, shortlist fits (follow `fm-hunt`).
3. **Draft.** For up to 15 shortlisted jobs with a stored recipient, draft with the `fm-draft` rules. Never exceed what the user can review in one sitting.
4. **Review.** Run the `fm-review` steps.
5. **Report.** One message: new roles found, drafts waiting (link to `/outreach`), replies and follow-ups, problems. Do not send anything; the user approves, then runs `queue_approved_outreach` or presses Send approved.

To run it automatically, schedule this skill as a daily routine. The server cron `POST /api/workers/sourcing` (Bearer `CRON_SECRET`) keeps boards fresh even when no Claude session is open.
