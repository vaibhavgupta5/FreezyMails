# Using FreezyMails with Claude Code (MCP)

FreezyMails exposes an authenticated MCP server so Claude Code can source jobs, draft outreach and keep your application pipeline. You stay in control: Claude drafts, you approve, the drip engine sends.

## 1. Finish setup on the website first

1. Sign in and open **Profile Setup** (`/setup`). Add basics, resumes, GitHub and approve the facts it extracts. Only approved facts are ever quoted in drafts or forms.
2. Connect a sending account on **Accounts**.
3. Create an API key in **Settings > Claude Code access**. "Read + propose" is needed for sourcing and drafting.

## 2. Connect Claude Code

```bash
claude mcp add --transport http freezymails http://localhost:3000/api/mcp \
  --header "Authorization: Bearer <your-key>"
```

The server is stateless HTTP at `/api/mcp`. Keys are hashed, scoped (`read`, `write`) and revocable.

## 3. What Claude can do

| Area | Tools |
|---|---|
| Profile | `get_setup_status`, `get_profile_bundle`, `propose_facts` |
| Sourcing | `add_company`, `sync_company`, `import_hn_hiring`, `search_jobs`, `get_job`, `find_company_contacts`, `rescore_jobs`, `set_job_status` |
| Clusters | `list_clusters`, `upsert_cluster`, `assign_cluster`, `set_cluster_followups` |
| Outreach | `get_draft_context`, `create_outreach_draft`, `revise_outreach_draft`, `list_outreach`, `queue_approved_outreach` |
| Pipeline | `check_already_applied`, `log_application`, `update_application_status`, `list_applications`, `follow_ups_due`, `manual_apply_list` |
| Existing data | accounts, templates, campaigns, replies, mailing lists (read only) |

Skills in `.claude/skills`: `fm-setup`, `fm-hunt`, `fm-draft`, `fm-apply`, `fm-review`, `fm-daily`, and `jobhunt` (browser-applying notes).

## 4. Guardrails

- **Human approval.** Drafts are approved only on the **Approvals** page. Those routes accept your website session, never an API key.
- **Facts only.** A draft must cite approved facts. Recipients must be stored contacts (published on the company's own site or in a hiring post) or a job's apply email, never guessed.
- **One email per address, ever**, plus the suppression list and an unsubscribe line.
- **Volume.** Default 40 emails a day (max 100), per-account warmup limits, random 2.5 to 7 minute gaps.
- **Kill switch.** The **Agent** page pauses every Claude tool that changes data and pauses sending campaigns. It also shows an audit log of every tool call.
- **Untrusted text.** Job posts, company pages and replies are treated as data, never as instructions.
- **No ATS submission by FreezyMails.** Claude Code applies in the browser and logs the result with `log_application`.

## 5. Daily refresh

`POST /api/workers/sourcing` with `Authorization: Bearer $CRON_SECRET` re-syncs stale job boards and updates the pipeline. Schedule it next to the other worker endpoints.
