# Existing Gmail Connection Flow

This document outlines the step-by-step flow of how a user connects their Google Workspace / Gmail account to FreezyMails for sending cold emails.

## Step 1: User Initiates Connection
* **Location:** `src/app/(app)/accounts/_components/AccountForm.tsx`
* **Action:** The user clicks the "Connect with Google" button on the Accounts page.
* **Trigger:** The button's `onClick` handler performs a client-side navigation (`window.location.href`) to `/api/auth/google/login`.

## Step 2: OAuth Login Route
* **Location:** `src/app/api/auth/google/login/route.ts`
* **Action:** The API route verifies that a user is currently logged in via Supabase (`getUser()`).
* **Trigger:** It uses the Google Auth Library (`getGoogleOAuthClient()`) to generate an OAuth 2.0 authorization URL. 
* **Parameters:**
  * `access_type: 'offline'`: Requests a refresh token.
  * `prompt: 'consent'`: Forces the consent screen to ensure a refresh token is always returned.
  * `scope`: Requests access to `mail.google.com` (full IMAP/SMTP access), user email, and user profile.
  * `state`: Passes the current Supabase `user.id` to link the account later.
* **Result:** The user is redirected to Google's OAuth consent screen.

## Step 3: Google Consent Screen
* **Location:** Google's servers.
* **Action:** The user logs into their Google account and grants FreezyMails permission to read, compose, send, and permanently delete all their email from Gmail (due to the `mail.google.com` scope).

## Step 4: OAuth Callback Route
* **Location:** `src/app/api/auth/google/callback/route.ts`
* **Action:** Google redirects the user back to this callback URL with a `code` and the `state` parameter.
* **Validation:** 
  * Checks for errors in the URL.
  * Ensures `code` and `state` are present.
  * Verifies the currently logged-in user (`getUser()`) matches the `state` parameter to prevent CSRF attacks.
* **Token Exchange:** It exchanges the authorization `code` for an `access_token` and `refresh_token` using `client.getToken(code)`.
* **Profile Fetch:** It uses the new tokens to fetch the user's profile from `https://www.googleapis.com/oauth2/v2/userinfo` to get their email address and name.

## Step 5: Save Email Account
* **Location:** `src/app/api/auth/google/callback/route.ts`
* **Action:** It creates a new record in the `EmailAccount` database table.
* **Data Saved:**
  * `userId`: The current FreezyMails user ID.
  * `provider`: Set to `'google'`.
  * `label`, `fromEmail`: The Google account's email address.
  * `fromName`: The Google account's name.
  * `accessToken`: The Google OAuth access token.
  * `refreshToken`: The Google OAuth refresh token (crucial for long-term offline access).
  * `tokenExpiresAt`: The expiry timestamp of the access token.
  * `isActive`: `true`
  * `healthScore`: `100`

## Step 6: Completion
* **Location:** `src/app/api/auth/google/callback/route.ts`
* **Action:** The user is redirected back to the Accounts page with a success query parameter: `/accounts?success=google_connected`.
