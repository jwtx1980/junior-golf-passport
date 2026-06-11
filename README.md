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

- Auth: Supabase Auth with email/password sign in
- Database: Supabase tables for golfers, courses, rounds, achievements, tournaments, photos, and memories
- Photos: Supabase Storage bucket exists; upload UI still needs to be added
- AI helper: Supabase Edge Function with free pasted-JSON validation and paid/entitled OpenAI path
- Course verification: manual course entry now; maps/geocoding verification later

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
GET  /golfers/:slug/public
GET  /dashboard/golfers
GET  /dashboard/golfers/:id/entries
POST /golfers
POST /courses
POST /rounds
POST /memories
POST /achievements
POST /tournaments
POST /ai/parse-pasted-result
POST /ai/draft-entry
```

Already set Edge Function secrets:

```text
JGP_SUPABASE_URL
JGP_SUPABASE_SERVICE_ROLE_KEY
```

Still needed before built-in AI works:

```powershell
npx supabase secrets set OPENAI_API_KEY="sk-..."
```

The free `Use Your Own AI` flow does not require an OpenAI key because users copy
the generated prompt into their own AI tool and paste JSON back into the
dashboard.

## Domain

The `CNAME` file is set to:

```text
juniorgolfpassport.com
```
