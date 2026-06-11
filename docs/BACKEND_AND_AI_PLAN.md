# Junior Golf Passport Backend And AI Plan

## Product Direction

Junior Golf Passport should become an account-based golf memory app, but the
first real product center is still Kara Walker's public passport.

The public site should show approved passport content:

- golfer story
- course map
- course passport
- favorite rounds
- achievements
- tournament history
- photos and memories
- goals

The private dashboard should be where all editing happens. Public visitors
should never edit the passport.

## Account Model

Separate the person who signs in from the golfer profile being managed.

Recommended concepts:

- Auth user: the person with a login.
- Golfer: the public/private passport profile, such as Kara Walker.
- Golfer member: grants a user permission to manage a golfer.

This lets a parent, golfer, or admin manage the same passport without tying the
public profile directly to one login identity.

Initial users:

- Kara: first real golfer/user, temporary password `password`.
- Jamie/JW account: likely admin/owner access.

Kara's temporary password should not be treated as permanent. Add a profile flag:

```text
must_change_password = true
```

On first dashboard login, the app should force a password update before showing
normal dashboard tools. After the update:

```text
must_change_password = false
```

## Access Levels

Suggested roles:

- `admin`: can manage all golfers and backend settings.
- `owner`: can manage assigned golfer profiles.
- `viewer`: can view private content for assigned golfer profiles.

Suggested AI entitlement:

```text
has_ai_access = true | false
```

Kara should start with `has_ai_access = true`. Jamie/JW probably should too.

## Free Manual Logging

Manual logging should be free for all users.

A free user should be able to:

- create an account
- create or manage an assigned golfer profile
- add courses manually
- add rounds manually
- add memories manually
- add achievements manually
- add tournament results manually
- choose visibility, such as private, unlisted, or public
- review entries before publishing

Manual logging should not call OpenAI and should not require a subscription.

## Free Bring-Your-Own-AI Prompt Flow

This is the clever free AI-style path.

The site does not call OpenAI. Instead, the site generates a prompt that the user
copies into their own AI tool, such as ChatGPT, Claude, Gemini, or another model.

Flow:

1. User writes a rough golf note in Junior Golf Passport.
2. User clicks `Use Your Own AI`.
3. The site generates a copyable prompt.
4. User pastes the prompt into their own AI source.
5. The external AI returns structured JSON.
6. User copies the JSON back into Junior Golf Passport.
7. The site validates and parses the JSON.
8. The site shows a review screen.
9. User edits and saves.

This costs Junior Golf Passport nothing in OpenAI usage because the user is
using their own AI source.

Important rule: pasted AI output should never be saved blindly. It should always
go through validation and review.

### Prompt Template

The generated prompt should include the user's rough note and strict output
instructions.

Example:

```text
You are helping turn a junior golfer's rough golf note into a structured
Junior Golf Passport entry.

Return only valid JSON. Do not include markdown. Do not include comments.
If you are unsure about a value, use null and add a question in the questions
array. Do not invent scores, dates, or locations.

Rough note:
"""
Played Gannon Municipal in Lynn MA. Fun old course. Kara hit a great drive on 7
and we want to remember it.
"""

Return JSON with this shape:

{
  "entry_type": "course_played | round | achievement | tournament | memory",
  "title": "short title",
  "course": {
    "name": "course name or null",
    "city": "city or null",
    "state": "state or null",
    "country": "country or null"
  },
  "round": {
    "played_on": "YYYY-MM-DD or null",
    "score": null,
    "holes": null,
    "highlight": "short highlight or null"
  },
  "achievement": {
    "type": "achievement type or null",
    "value": "achievement value or null"
  },
  "tournament": {
    "name": "event name or null",
    "division": "division or null",
    "finish": "finish or null"
  },
  "story": "polished public-friendly story draft",
  "tags": ["tag one", "tag two"],
  "visibility": "private",
  "confidence": "high | medium | low",
  "questions": ["question one if needed"]
}
```

Example expected JSON:

```json
{
  "entry_type": "course_played",
  "title": "Massachusetts passport stamp at Gannon Municipal",
  "course": {
    "name": "Gannon Municipal Golf Course",
    "city": "Lynn",
    "state": "Massachusetts",
    "country": "United States"
  },
  "round": {
    "played_on": null,
    "score": null,
    "holes": null,
    "highlight": "Strong drive on hole 7"
  },
  "achievement": {
    "type": null,
    "value": null
  },
  "tournament": {
    "name": null,
    "division": null,
    "finish": null
  },
  "story": "Kara added Massachusetts to her golf passport with a round at Gannon Municipal Golf Course in Lynn. The highlight was a strong drive on the 7th hole, one of those shots worth saving as part of the journey.",
  "tags": ["new state", "family round", "memorable drive"],
  "visibility": "private",
  "confidence": "medium",
  "questions": ["What date was the round played?", "Do you want to add a score?"]
}
```

## Paid Built-In AI Flow

Paid or entitled users should be able to click one button and have Junior Golf
Passport call AI directly.

Flow:

1. User signs in.
2. User writes a rough note.
3. User clicks `Draft With AI`.
4. Browser sends the note to a Supabase Edge Function.
5. Edge Function verifies the Supabase access token.
6. Edge Function checks `has_ai_access`.
7. Edge Function calls OpenAI with the server-side API key.
8. Edge Function returns structured JSON and a polished draft.
9. User reviews and edits.
10. User saves.

The OpenAI key must never be in browser JavaScript or GitHub Pages files.

## Course Verification

AI can suggest the likely course, city, and state, but it should not be trusted
as the final source for map coordinates.

Recommended approach:

- Start with manual course entry and optional manual latitude/longitude.
- Add a course lookup source later, ideally Google Places or a geocoding/maps
  API.
- Store verification status on courses.

Suggested course verification fields:

```text
verification_status = manual | ai_suggested | verified | needs_review
verification_source = google_places | manual_admin | imported | unknown
source_place_id = optional external place id
```

## Recommended Supabase Architecture

Keep GitHub Pages as the frontend host for now.

Use Supabase for:

- Auth
- Postgres database
- Row Level Security
- Storage
- Edge Functions
- server-side OpenAI calls

Frontend should only know:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
PASSPORT_API_BASE_URL
```

Backend secrets should only live in Supabase secrets:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_MODEL
```

## Initial Database Tables

Suggested first-pass tables:

```text
profiles
golfers
golfer_members
courses
rounds
memories
achievements
tournaments
photos
ai_requests
```

### profiles

Stores account-level data tied to `auth.users`.

Fields:

- `id`
- `email`
- `display_name`
- `role`
- `has_ai_access`
- `must_change_password`
- `created_at`
- `updated_at`

### golfers

Stores golfer passport profiles.

Fields:

- `id`
- `slug`
- `display_name`
- `headline`
- `bio`
- `home_state`
- `visibility`
- `created_at`
- `updated_at`

### golfer_members

Maps users to golfer profiles.

Fields:

- `id`
- `golfer_id`
- `user_id`
- `member_role`
- `created_at`

### courses

Stores courses and map data.

Fields:

- `id`
- `name`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`
- `verification_status`
- `verification_source`
- `source_place_id`
- `created_at`
- `updated_at`

### rounds

Stores played rounds.

Fields:

- `id`
- `golfer_id`
- `course_id`
- `played_on`
- `score`
- `holes`
- `tees`
- `notes`
- `story`
- `visibility`
- `is_approved`
- `created_by`
- `created_at`
- `updated_at`

### memories

Stores scrapbook entries and polished stories.

Fields:

- `id`
- `golfer_id`
- `course_id`
- `round_id`
- `title`
- `entry_type`
- `story`
- `raw_note`
- `tags`
- `visibility`
- `is_approved`
- `created_by`
- `created_at`
- `updated_at`

### achievements

Stores milestones.

Fields:

- `id`
- `golfer_id`
- `title`
- `achievement_type`
- `achieved_on`
- `course_id`
- `round_id`
- `value`
- `story`
- `visibility`
- `is_approved`
- `created_by`
- `created_at`
- `updated_at`

### tournaments

Stores tournament history.

Fields:

- `id`
- `golfer_id`
- `course_id`
- `event_name`
- `played_on`
- `division`
- `score`
- `finish`
- `result_url`
- `story`
- `visibility`
- `is_approved`
- `created_by`
- `created_at`
- `updated_at`

### photos

Stores metadata for Supabase Storage objects.

Fields:

- `id`
- `golfer_id`
- `storage_path`
- `caption`
- `linked_type`
- `linked_id`
- `visibility`
- `is_approved`
- `uploaded_by`
- `created_at`

### ai_requests

Stores direct built-in AI request history.

Fields:

- `id`
- `user_id`
- `golfer_id`
- `request_type`
- `model`
- `status`
- `provider_request_id`
- `token_usage_json`
- `estimated_provider_cost_micros`
- `created_at`
- `completed_at`
- `error_message`

## Suggested Edge Function

Function name:

```text
passport-api
```

Initial endpoints:

```text
GET  /me
GET  /features
GET  /golfers/:slug/public
GET  /dashboard/golfers
GET  /dashboard/golfers/:id/entries
POST /courses
POST /rounds
POST /memories
POST /achievements
POST /tournaments
POST /photos
PATCH /entries/:kind/:id
DELETE /entries/:kind/:id
POST /ai/draft-entry
POST /ai/parse-pasted-result
```

Notes:

- Manual create endpoints do not require AI access.
- `/ai/draft-entry` requires `has_ai_access = true`.
- `/ai/parse-pasted-result` should validate pasted JSON but should not call
  OpenAI.

## First Build Order

1. Create and link a separate Supabase project for Junior Golf Passport.
2. Add `supabase/config.toml`, migrations, and `passport-api` Edge Function
   scaffold to this repo.
3. Create tables and RLS policies.
4. Seed Kara's golfer profile and account/member access.
5. Build real dashboard sign-in with Supabase Auth.
6. Enforce password change for temporary-password accounts.
7. Build manual add/edit forms.
8. Wire public `/Kara/` to approved Supabase data.
9. Add free `Use Your Own AI` prompt and pasted JSON review flow.
10. Add paid/entitled built-in AI through the Edge Function.
11. Add photo upload.
12. Add course verification through maps/geocoding.
13. Add real subscription/payment after the product flow is proven.

## Supabase Project Decision

Current local CLI access can list projects, but the Junior Golf Passport repo is
now links to the dedicated Junior Golf Passport project.

Known visible projects from the CLI:

- `jamies-food-tracker`
- `jwtx1980's Project`
- `junior-golf-passport`

Decision:

Use a separate Supabase project for Junior Golf Passport so golf users, auth,
storage, billing, logs, and future product data do not mix with Jamie's Food
Tracker.

Current project:

```text
Project URL: https://znstslovujtpmydnrcxf.supabase.co
Project ref: znstslovujtpmydnrcxf
Edge Function: passport-api
API base: https://znstslovujtpmydnrcxf.functions.supabase.co/passport-api
```

## Open Questions

- What email should Kara use for her first account?
- What email should Jamie/JW use for admin?
- Should all new entries default to private until approved?
- Should Kara's page be editable by Kara, Jamie/JW, or both?
- Should we start with password login, magic-link login, or both?
- Do we have, or want to create later, a Google Places API key for course
  verification?
- Should Stripe/subscriptions wait until after manual logging and prompt-based
  AI are working?

## Recommended Immediate Next Step

Start with backend foundation and manual logging, not subscriptions.

Build:

- Supabase project linkage: done
- schema migrations: started and pushed
- Kara seeded public golfer/profile data: public golfer and starter passport data done
- auth dashboard: started
- password-change enforcement: backend/dashboard support started
- account bootstrap tooling: local script can create/update real Auth users,
  profile roles, AI entitlement, temporary-password flags, and golfer
  memberships once Kara/Jamie emails are known
- admin access: account-level admins can now load and edit all golfer profiles
  through the Edge Function and RLS helper, even before a golfer-specific
  membership exists
- manual course/round/memory forms: dashboard can save courses, memories, course
  stamps, rounds, achievements, and tournaments
- protected dashboard entry log: dashboard can load recent rounds, memories,
  achievements, tournaments, and photos for the selected golfer
- public page reading approved data: started for Kara courses, memories,
  achievements, tournaments, and photos; private photo files stay in Supabase
  Storage and are exposed through short-lived signed URLs from the Edge Function
- free copy-prompt AI flow: prompt generation, pasted JSON validation, review,
  and save path started
- built-in paid/entitled AI flow: Edge Function route exists and checks
  `has_ai_access`, but still needs the `OPENAI_API_KEY` Supabase secret before it
  can be used
- photo upload through Supabase Storage: started in the dashboard with caption,
  visibility, approval, metadata save, and dashboard/public signed URL reads
- edit/delete saved entries and photos: dashboard can edit review fields,
  captions, visibility, and approval, and can delete entries and stored photos
- manual course verification fields: dashboard can capture latitude, longitude,
  verification status, and verification source when creating course-backed
  entries
- automated course lookup: dashboard and Edge Function support server-side
  Google Places Text Search candidates, but live lookup needs the
  `GOOGLE_PLACES_API_KEY` Supabase secret before it can return verified matches
- feature readiness: dashboard reads a safe `/features` endpoint so built-in AI
  and course lookup controls are disabled with setup hints until the required
  Supabase secrets are present
- dashboard onboarding: signed-in users see a compact manual-first workflow,
  clearer empty states, and clear/cancel controls while adding or editing
  entries and photos
- live public map data: Kara's map now hydrates from approved Supabase rounds and
  course coordinates, with the original built-in map list as fallback

Then add:

- real Kara/Jamie accounts and golfer memberships
- first-login password update test with Kara's temporary password
- Google Places secret and live lookup verification
- subscription/payment only after the product flow is proven
