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
- Dashboard: private entry creation/editing, password-change enforcement, and a passport snapshot of saved/public/draft/pinned content
- Photos: Supabase Storage with dashboard upload, metadata review, and signed public reads
- AI helper: Supabase Edge Function with free pasted-JSON validation and paid/entitled OpenAI path
- Course verification: manual coordinates plus optional server-side Google Places lookup

OpenAI keys should never be placed in public browser code. The browser should send rough notes to an authenticated backend function, receive structured data and a story draft, and save only after parent review.

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
npx supabase secrets set OPENAI_API_KEY="sk-..."
npx supabase secrets set GOOGLE_PLACES_API_KEY="..."
```

`OPENAI_API_KEY` is required before built-in AI works. `GOOGLE_PLACES_API_KEY`
enables dashboard course lookup and verified map pins through Google Places.

The free `Use Your Own AI` flow does not require an OpenAI key because users copy
the generated prompt into their own AI tool and paste JSON back into the
dashboard.

## Account Bootstrap

Create real Kara/Jamie accounts with the local bootstrap script after exporting
the Junior Golf Passport service-role key in your shell. Do not commit the
service-role key.

```powershell
$env:JGP_SUPABASE_URL="https://znstslovujtpmydnrcxf.supabase.co"
$env:JGP_SUPABASE_SERVICE_ROLE_KEY="paste-service-role-key-here"
```

Kara should start with AI access and a temporary password that must be changed
on first sign-in:

```powershell
deno run --allow-env --allow-net scripts/bootstrap-account.ts `
  --email kara@example.com `
  --password password `
  --display-name "Kara Walker" `
  --profile-role owner `
  --member-role owner `
  --golfer-slug kara `
  --has-ai-access true `
  --must-change-password true
```

Jamie/JW can be added as an admin with AI access:

```powershell
deno run --allow-env --allow-net scripts/bootstrap-account.ts `
  --email jamie@example.com `
  --password "replace-this-temporary-password" `
  --display-name "Jamie Walker" `
  --profile-role admin `
  --member-role owner `
  --golfer-slug kara `
  --has-ai-access true `
  --must-change-password true
```

## Domain

The `CNAME` file is set to:

```text
juniorgolfpassport.com
```
