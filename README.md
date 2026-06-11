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

The public site should stay centered on Kara's approved passport content. Editing belongs in `/dashboard/` once authentication is added.

Planned stack:

- Auth: Supabase Auth with parent magic-link login
- Database: Supabase tables for golfers, courses, rounds, achievements, tournaments, goals, and memories
- Photos: Supabase Storage
- AI helper: Supabase Edge Function calling OpenAI from the server side only
- Course verification: maps/geocoding API for course names and coordinates before pins are saved

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
