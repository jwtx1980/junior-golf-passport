<#
Sets Junior Golf Passport Supabase Edge Function secrets.

Usage:
  1. Leave the key variables blank and run the script to be prompted, or paste
     keys between the quotes below on your machine.
  2. Run from the repo root:
       .\scripts\set-live-secrets.ps1

Do not commit real keys.
#>

$OpenAIKey = ""
$GooglePlacesKey = ""
$OpenAIModel = "gpt-5.4-mini"
$AiDailyLimit = "25"

$ProjectRef = "znstslovujtpmydnrcxf"
$FeaturesUrl = "https://znstslovujtpmydnrcxf.functions.supabase.co/passport-api/features"

function Read-SecretText {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  $secure = Read-Host $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Set-SupabaseSecrets {
  param([Parameter(Mandatory = $true)][string[]]$Secrets)

  Write-Host "Saving Supabase secrets..."
  & npx supabase secrets set @Secrets --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed while saving secrets."
  }
}

if (-not $OpenAIKey -or $OpenAIKey -eq "PASTE_OPENAI_KEY_HERE") {
  $OpenAIKey = Read-SecretText "Paste the OpenAI API key"
}

if (-not $OpenAIKey) {
  throw "OPENAI_API_KEY is required for built-in AI."
}

$secretsToSet = @(
  "OPENAI_API_KEY=$OpenAIKey",
  "OPENAI_MODEL=$OpenAIModel",
  "JGP_AI_DAILY_LIMIT=$AiDailyLimit"
)

if (-not $GooglePlacesKey -or $GooglePlacesKey -eq "PASTE_GOOGLE_PLACES_KEY_HERE") {
  $GooglePlacesKey = Read-SecretText "Paste the Google Places API key, or press Enter to skip"
}

if ($GooglePlacesKey) {
  $secretsToSet += "GOOGLE_PLACES_API_KEY=$GooglePlacesKey"
} else {
  Write-Host "Skipping GOOGLE_PLACES_API_KEY. Manual course entry will still work."
}

Set-SupabaseSecrets -Secrets $secretsToSet

Write-Host "Checking backend feature readiness..."
$features = Invoke-RestMethod -Method Get -Uri $FeaturesUrl
$features | ConvertTo-Json

Write-Host "Done."
