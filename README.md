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
- `/dashboard/` - static private-dashboard preview for the future authenticated admin area
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

## Domain

The `CNAME` file is set to:

```text
juniorgolfpassport.com
```
