# Junior Golf Passport Launch Checklist

This checklist tracks the remaining setup needed to move from the current Kara
passport prototype to a live, usable account-backed product.

## Already Working

- Dedicated Supabase project for Junior Golf Passport.
- Public Kara passport reading approved Supabase data.
- Private dashboard sign-in with Supabase Auth.
- Manual logging for courses, rounds, memories, achievements, tournaments,
  goals, and photos.
- Public/private/unlisted visibility and approval controls.
- First-login password-change enforcement for temporary-password accounts.
- Free `Use Your Own AI` prompt flow with pasted JSON validation and review.
- Built-in AI Edge Function route with entitlement checks.
- Server-side course lookup route and dashboard controls.
- Supabase Storage photo uploads with signed public/dashboard URLs.

## Needs User Input

1. Choose Kara's real login email.
2. Choose Jamie/JW's admin login email.
3. Decide whether new public signups should create their first golfer profile
   automatically or by using the current dashboard form.
4. Decide when to enable subscriptions. Manual logging and copy-prompt AI should
   stay free.

## Supabase Secrets

Set these in the Junior Golf Passport Supabase project before testing paid AI or
live course lookup:

```powershell
npx supabase secrets set OPENAI_API_KEY="sk-..."
npx supabase secrets set GOOGLE_PLACES_API_KEY="..."
```

Optional model override:

```powershell
npx supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
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

Run this only after the real email addresses are known and the service-role key
is available in the local shell.

```powershell
$env:JGP_SUPABASE_URL="https://znstslovujtpmydnrcxf.supabase.co"
$env:JGP_SUPABASE_SERVICE_ROLE_KEY="paste-service-role-key-here"

deno run --allow-env --allow-net scripts/bootstrap-account.ts `
  --email kara@example.com `
  --password password `
  --display-name "Kara Walker" `
  --profile-role owner `
  --member-role owner `
  --golfer-slug kara `
  --has-ai-access true `
  --must-change-password true

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

## Verification Gates

- Kara can sign in with the temporary password and is forced to update it.
- Kara can add a manual private note without using AI.
- Kara can generate a `Use Your Own AI` prompt, paste JSON back, review, and
  save.
- Kara can use `Draft With AI` only after `OPENAI_API_KEY` is configured.
- Course lookup returns Google Places candidates only after
  `GOOGLE_PLACES_API_KEY` is configured.
- Public Kara page shows only approved public or unlisted content.
- Private photos never expose permanent storage URLs.
- GitHub Pages custom domain works over HTTPS.

## Later Product Work

- Stripe subscriptions for built-in AI access.
- Admin user management screen.
- Automatic first-golfer creation during onboarding.
- Exportable golf resume view.
- Multi-golfer family accounts.
