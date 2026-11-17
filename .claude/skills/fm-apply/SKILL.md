---
name: fm-apply
description: Apply to a job on its Greenhouse, Lever, Ashby or company form in the browser and record it in FreezyMails. Use when the user asks to apply to shortlisted roles through the ATS rather than by email.
---

# Applying on ATS forms, logged in FreezyMails

You fill and submit forms in the browser (see the `jobhunt` skill for platform quirks). FreezyMails only records the result. It never submits for you.

## Before each application
1. `check_already_applied` with the `jobId` or URL. If it says already applied, skip it.
2. `get_job` for the full posting. Confirm eligibility: location, graduating class, years of experience, work authorization. If it does not fit, `set_job_status` DISMISSED and move on.
3. `get_profile_bundle` once per run. Use the cluster's resume (`list_clusters` shows `resumeDocId`; download it from the bundle's download URL).

## Filling the form
- Answers come only from approved facts and the profile. Never invent a number, employer, date or skill.
- Work authorization, relocation and visa questions: answer exactly what the profile says. If it does not say, stop and ask the user.
- A required question with no matching fact: stop, ask the user, do not guess.
- Do not solve CAPTCHAs. If one blocks you, put the role on the manual list and continue.
- Greenhouse and Ashby usually go through; Lever often shows a visible challenge, so give the user a ready-to-click row instead.

## Submitting
Autonomy default: fill and verify, then **ask the user before pressing Submit**, unless they have told you to auto-submit for this cluster in this conversation.

## After submitting
Verify on the confirmation page or the receipt email, then `log_application` with `channel: ATS`, `atsKind`, the job, the resume used, and `evidence` (confirmation text or receipt subject). Set `verified: true` only if you saw that proof. If submission is uncertain, log it unverified and say so; never re-submit to check.

## Manual list
`manual_apply_list` gives markdown rows for anything the user should do by hand (LinkedIn and similar). Do not automate sites whose terms forbid it.
