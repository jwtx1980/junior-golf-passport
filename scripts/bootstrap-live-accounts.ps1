<#
Creates or updates the real Junior Golf Passport launch accounts.

Run from the repo root:
  .\scripts\bootstrap-live-accounts.ps1

The script prompts for the Supabase service-role key. Do not commit that key.
#>

$KaraEmail = "kara.walker5115@gmail.com"
$JamieEmail = "jwtx1980@gmail.com"
$KaraTemporaryPassword = "password"
$JamieTemporaryPassword = "password"
$SupabaseUrl = "https://znstslovujtpmydnrcxf.supabase.co"

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

function Invoke-Bootstrap {
  param(
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Password,
    [Parameter(Mandatory = $true)][string]$DisplayName,
    [Parameter(Mandatory = $true)][string]$ProfileRole,
    [Parameter(Mandatory = $true)][string]$MemberRole
  )

  & deno run --allow-env --allow-net scripts/bootstrap-account.ts `
    --email $Email `
    --password $Password `
    --display-name $DisplayName `
    --profile-role $ProfileRole `
    --member-role $MemberRole `
    --golfer-slug kara `
    --has-ai-access true `
    --must-change-password true

  if ($LASTEXITCODE -ne 0) {
    throw "Account bootstrap failed for $Email."
  }
}

$serviceRoleKey = Read-SecretText "Paste the Junior Golf Passport Supabase service-role key"
if (-not $serviceRoleKey) {
  throw "Service-role key is required to create or update auth users."
}

$env:JGP_SUPABASE_URL = $SupabaseUrl
$env:JGP_SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey

Invoke-Bootstrap `
  -Email $KaraEmail `
  -Password $KaraTemporaryPassword `
  -DisplayName "Kara Walker" `
  -ProfileRole "owner" `
  -MemberRole "owner"

Invoke-Bootstrap `
  -Email $JamieEmail `
  -Password $JamieTemporaryPassword `
  -DisplayName "Jamie Walker" `
  -ProfileRole "admin" `
  -MemberRole "owner"

Remove-Item Env:\JGP_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue

Write-Host "Launch accounts are ready. Both accounts will be asked to change the temporary password on first sign-in."
