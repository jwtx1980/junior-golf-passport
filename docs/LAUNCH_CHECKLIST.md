# Junior Golf Passport Launch Checklist

This checklist tracks the remaining setup needed to move from the current Kara
passport prototype to a live, usable account-backed product.

## Already Working

- Dedicated Supabase project for Junior Golf Passport.
- Public Kara passport reading approved Supabase data.
- Generic public passport page for non-Kara golfer profiles.
- Private dashboard sign-in with Supabase Auth.
- Manual logging for courses, rounds, memories, achievements, tournaments,
  goals, and photos.
- Public/private/unlisted visibility and approval controls.
- First-login password-change enforcement for temporary-password accounts.
- Free `Use Your Own AI` prompt flow with pasted JSON validation and review.
- Built-in AI Edge Function route with entitlement checks.
- Server-side course lookup route and dashboard controls.
- Supabase Storage photo uploads with signed public/dashboard URLs.
- Real Kara and Jamie/JW auth accounts with AI access and Kara passport access.

## Needs User Input

1. Kara/Jamie need to sign in once and replace the temporary password.
2. Decide whether new public signups should create their first golfer profile
   automatically or by using the current dashboard form.
3. Decide when to enable subscriptions. Manual logging and copy-prompt AI should
   stay free.

## Supabase Secrets

Set these in the Junior Golf Passport Supabase project before testing paid AI or
live course lookup. The easiest local path is:

```powershell
.\scripts\set-live-secrets.ps1
```

That script prompts for `OPENAI_API_KEY`, optionally prompts for
`GOOGLE_PLACES_API_KEY`, sets `OPENAI_MODEL`, and checks `/features`.

Google course lookup also requires **Places API (New)** to be enabled in the
same Google Cloud project as the API key. If lookup returns a Google error that
`places.googleapis.com` has not been used or is disabled, enable that API in
Google Cloud and wait a few minutes for it to propagate.

Manual commands, if needed:

```powershell
npx supabase secrets set OPENAI_API_KEY="sk-..." --project-ref znstslovujtpmydnrcxf
npx supabase secrets set OPENAI_MODEL="gpt-5.4-mini" --project-ref znstslovujtpmydnrcxf
npx supabase secrets set JGP_AI_DAILY_LIMIT="25" --project-ref znstslovujtpmydnrcxf
npx supabase secrets set GOOGLE_PLACES_API_KEY="..." --project-ref znstslovujtpmydnrcxf
```

After setting secrets, verify:

```powershell
Invoke-RestMethod https://znstslovujtpmydnrcxf.functions.supabase.co/passport-api/features
```

Expected result after both keys are configured:

```json
{
  "built_in_ai_configured": true,
  "course_lookup_configured": true
}
```

## Real Account Bootstrap

Run this only after the service-role key is available. The wrapper uses the real
Kara/Jamie emails and temporary passwords:

```powershell
.\scripts\bootstrap-live-accounts.ps1
```

It creates or updates:

- Kara: `kara.walker5115@gmail.com`, owner of Kara's passport, AI access enabled,
  temporary password `password`, must change password on first sign-in.
- Jamie/JW: `jwtx1980@gmail.com`, admin, owner member of Kara's passport, AI
  access enabled, temporary password `password`, must change password on first
  sign-in.

The lower-level Deno script is still available for custom accounts:
`scripts/bootstrap-account.ts`.

## Google Places Decision

Google Places is not required for the first launch because the dashboard already
supports manual course entry and manual latitude/longitude. Add it when verified
course pins become annoying to maintain by hand.

When enabled, keep lookup in the private dashboard only. Do not add public
autocomplete until subscriptions or strict quota controls exist.

Cost note checked June 11, 2026: our current lookup asks Google for course
display name, address, and location, which places it in the Text Search Pro tier.
Google's public pricing currently shows a free usage cap for that tier before
paid usage. This should be inexpensive for private admin lookup, but it should
not be exposed as a public search box without quota controls.

OpenAI cost note checked June 11, 2026: use a mini model for rough-note drafting
and set a monthly budget/alert in the OpenAI dashboard before opening built-in AI
to more users. The Edge Function also enforces a default `JGP_AI_DAILY_LIMIT` of
25 built-in drafts per account per UTC day; the free copy-prompt flow is not
limited because it does not call our OpenAI key.

## Verification Gates

- Kara can sign in with the temporary password and is forced to update it.
- Kara can add a manual private note without using AI.
- Kara can generate a `Use Your Own AI` prompt, paste JSON back, review, and
  save.
- Kara can use `Draft With AI` only after `OPENAI_API_KEY` is configured.
- Course lookup returns Google Places candidates only after
  `GOOGLE_PLACES_API_KEY` is configured.
- Public Kara page shows only approved public or unlisted content.
- New golfer public links load the generic public passport route instead of a
  missing static slug page.
- Private photos never expose permanent storage URLs.
- GitHub Pages custom domain works over HTTPS.

## Later Product Work

- Stripe subscriptions for built-in AI access.
- Admin user management screen.
- Automatic first-golfer creation during onboarding.
- Exportable golf resume view.
- Multi-golfer family accounts.
