# Junior Golf Passport Website

Static first version of Junior Golf Passport, currently focused on Kara Walker's living golf passport.

## Local Preview

From this folder:

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8766/
```

## Pages

- `/` - Kara-first public homepage
- `/Kara/` - Kara Walker's public passport
- `/Kara/map/` - interactive golfed states map
- `/passport/?golfer=slug` - generic public passport page for any approved
  public or unlisted golfer profile
- `/dashboard/` - authenticated dashboard for manual logging, free prompt-based AI, and built-in AI access
- `/privacy/` - privacy policy draft
- `/terms/` - terms draft
- `/support/` - support page

## Build Direction

The public site should stay centered on Kara's approved passport content.
Editing belongs in the authenticated `/dashboard/`.

Current stack:

- Auth: Supabase Auth with email/password sign in and email magic-link support
- Database: Supabase tables for golfers, courses, rounds, achievements, tournaments, photos, and memories
- Goals: public/private goal tracking for passport milestones
- Dashboard: private entry creation/editing, password-change enforcement,
  selected-golfer public links, and a passport snapshot of saved/public/draft/pinned content
- Photos: Supabase Storage with dashboard upload, metadata review, and signed public reads
- AI helper: Supabase Edge Function with free pasted-JSON validation and paid/entitled OpenAI path
- Course verification: manual coordinates plus optional server-side Google Places lookup

OpenAI keys should never be placed in public browser code. The browser should send rough notes to an authenticated backend function, receive structured data and a story draft, and save only after parent review.

For the remaining launch steps, real account setup, secrets, and verification
gates, see [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).

## Supabase Backend

This repo is linked to the dedicated Junior Golf Passport Supabase project:

```text
Project URL: https://znstslovujtpmydnrcxf.supabase.co
Project ref: znstslovujtpmydnrcxf
Edge Function: passport-api
API base: https://znstslovujtpmydnrcxf.functions.supabase.co/passport-api
```

Local checks:

```powershell
deno task check:passport-api
deno task check:bootstrap-account
deno task fmt:check
```

Deploy database migrations:

```powershell
npx supabase db push
```

Deploy the Edge Function:

```powershell
npx supabase functions deploy passport-api
```

Live API endpoints include:

```text
GET  /me
GET  /features
GET  /golfers/:slug/public
GET  /dashboard/golfers
GET  /dashboard/golfers/:id/entries
POST /golfers
PATCH /golfers/:id
POST /courses
POST /courses/lookup
POST /rounds
POST /memories
POST /achievements
POST /tournaments
POST /goals
POST /photos
PATCH /entries/:kind/:id
DELETE /entries/:kind/:id
POST /ai/parse-pasted-result
POST /ai/draft-entry
```

Already set Edge Function secrets:

```text
JGP_SUPABASE_URL
JGP_SUPABASE_SERVICE_ROLE_KEY
```

Optional secrets:

```powershell
.\scripts\set-live-secrets.ps1
```

`OPENAI_API_KEY` is required before built-in AI works. `GOOGLE_PLACES_API_KEY`
enables dashboard course lookup and verified map pins through Google Places.
Google Places is optional for launch because manual coordinates already work.
Built-in AI drafting is capped server-side at 25 drafts per account per UTC day
by default. Set `JGP_AI_DAILY_LIMIT` as a Supabase secret to change that cap.

The free `Use Your Own AI` flow does not require an OpenAI key because users copy
the generated prompt into their own AI tool and paste JSON back into the
dashboard.

## Account Bootstrap

Create or update the real Kara/Jamie accounts with the local bootstrap wrapper.
It prompts for the Junior Golf Passport service-role key. Do not commit the
service-role key.

```powershell
.\scripts\bootstrap-live-accounts.ps1
```

The wrapper sets:

- Kara: `kara.walker5115@gmail.com`, temporary password `password`, owner access,
  AI access, first-sign-in password update required.
- Jamie/JW: `jwtx1980@gmail.com`, temporary password `password`, admin access,
  AI access, first-sign-in password update required.

## Domain

The `CNAME` file is set to:

```text
juniorgolfpassport.com
```
