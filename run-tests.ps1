# Run every test suite in the repository and publish the Skills Health Dashboard.
#
#   pwsh run-tests.ps1                          # run all four default suites
#   pwsh run-tests.ps1 -NoOpen                  # ...without opening the dashboard (CI / agents)
#   pwsh run-tests.ps1 -IncludeSkillBehavior    # also run the provider-gated LLM suites
#   pwsh run-tests.ps1 -SkipE2E                 # skip the Playwright visual suite
#
# Default suites (nothing is skipped unless you ask):
#   1. Plugin validation  — scripts/build-plugin.py validate (manifest + skills)
#   2. Canvas extension   — .github/extensions/srs-navigator (node --test)
#   3. Skill evals        — evals/ deterministic tests (node --test, offline)
#   4. Canvas e2e         — Playwright visual suite (auto-starts scripts/serve-canvas.mjs)
#
# Opt-in, provider-gated (-IncludeSkillBehavior). These need an API key; without
# one they are reported as SKIPPED and never fail the run:
#   5. Skill behavior     — npm run test:skill-behavior (LLM traces the skill)
#   6. Live skill evals   — node evals/run-evals.mjs (LLM scores the skill)
#
# Output: docs/skills-health.html (human) + docs/skills-health.json (machine).
# Exit code is non-zero when any suite fails.

[CmdletBinding()]
param(
    [switch]$SkipValidate,
    [switch]$SkipCanvas,
    [switch]$SkipEvals,
    [switch]$SkipE2E,
    [switch]$IncludeSkillBehavior,
    # Do not open the dashboard in a browser when the run finishes.
    [switch]$NoOpen,
    # Do not write docs/skills-health.{json,html}.
    [switch]$NoDashboard
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
$CanvasDir = Join-Path $RepoRoot '.github/extensions/srs-navigator'
$StartedAt = (Get-Date).ToUniversalTime().ToString('o')
$RunTimer = [System.Diagnostics.Stopwatch]::StartNew()

$results = [System.Collections.Generic.List[object]]::new()

# API keys the LLM-backed suites accept. Any one of them enables the suite.
$ProviderKeys = @(
    'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_CLOUD_API_KEY', 'DEEPSEEK_API_KEY'
)

function Test-ProviderKey {
    foreach ($k in $ProviderKeys) {
        if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($k))) { return $k }
    }
    return $null
}

# Pull "tests / pass / fail / skipped" out of a suite's captured stdout. Handles
# both the node --test summary block and Playwright's "N passed" line.
function Get-SuiteCounts {
    param([string]$Text)

    $counts = @{ tests = 0; pass = 0; fail = 0; skipped = 0 }
    $matched = $false
    foreach ($key in 'tests', 'pass', 'fail', 'skipped') {
        # node --test prints "<glyph> tests 215"; \D* absorbs the glyph whatever its encoding.
        $m = [regex]::Matches($Text, "(?m)^\D*\b$key\s+(\d+)\s*$")
        if ($m.Count -gt 0) {
            $matched = $true
            foreach ($hit in $m) { $counts[$key] += [int]$hit.Groups[1].Value }
        }
    }
    if ($matched) { return $counts }

    # Playwright reporter: "18 passed (5.4s)", "2 failed", "1 skipped".
    foreach ($pair in @(@('passed', 'pass'), @('failed', 'fail'), @('skipped', 'skipped'))) {
        $m = [regex]::Match($Text, "(?m)^\s*(\d+)\s+$($pair[0])\b")
        if ($m.Success) { $matched = $true; $counts[$pair[1]] = [int]$m.Groups[1].Value }
    }
    if ($matched) { $counts.tests = $counts.pass + $counts.fail + $counts.skipped }
    return $counts
}

function Invoke-Suite {
    param(
        [string]$Name,
        [string]$Command,
        [scriptblock]$Action,
        # Optional: count "tests" by matching this pattern instead of a summary block.
        [string]$CountPattern
    )
    Write-Host ''
    Write-Host "==================== $Name ====================" -ForegroundColor Cyan
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $captured = ''
    try {
        $lines = & $Action 2>&1 | ForEach-Object { Write-Host $_; $_ }
        $captured = ($lines | Out-String)
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }
    }
    catch {
        Write-Host $_.Exception.Message -ForegroundColor Red
        $captured = $_.Exception.Message
        $code = 1
    }
    $sw.Stop()

    $counts = Get-SuiteCounts -Text $captured
    if ($CountPattern) {
        $n = ([regex]::Matches($captured, $CountPattern)).Count
        if ($n -gt 0) {
            $counts.tests = $n
            $counts.pass = if ($code -eq 0) { $n } else { 0 }
            $counts.fail = if ($code -eq 0) { 0 } else { $n }
        }
    }
    if ($counts.tests -eq 0 -and $code -ne 0) { $counts.tests = 1; $counts.fail = 1 }

    $script:results.Add([pscustomobject]@{
            name    = $Name
            command = $Command
            state   = if ($code -eq 0) { 'passed' } else { 'failed' }
            tests   = $counts.tests
            pass    = $counts.pass
            fail    = $counts.fail
            skipped = $counts.skipped
            seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
            reason  = ''
        })
}

function Add-SkippedSuite {
    param([string]$Name, [string]$Command, [string]$Reason)
    Write-Host ''
    Write-Host "==================== $Name ====================" -ForegroundColor Cyan
    Write-Host "  SKIPPED — $Reason" -ForegroundColor DarkGray
    $script:results.Add([pscustomobject]@{
            name   = $Name; command = $Command; state = 'skipped'
            tests  = 0; pass = 0; fail = 0; skipped = 0; seconds = 0
            reason = $Reason
        })
}

# The canvas suites need node_modules; the e2e suite also needs a browser binary.
function Install-CanvasDeps {
    param([switch]$WithBrowser)
    if (-not (Test-Path (Join-Path $CanvasDir 'node_modules'))) {
        Write-Host '  installing canvas node_modules (first run)...' -ForegroundColor DarkGray
        npm install --prefix $CanvasDir --no-audit --no-fund | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
    }
    if ($WithBrowser) {
        $marker = Join-Path $CanvasDir 'node_modules/.playwright-chromium-installed'
        if (-not (Test-Path $marker)) {
            Write-Host '  installing Playwright Chromium (first run)...' -ForegroundColor DarkGray
            Push-Location $CanvasDir
            try { npx --yes playwright install chromium | Out-Host } finally { Pop-Location }
            if ($LASTEXITCODE -eq 0) { New-Item -ItemType File -Path $marker -Force | Out-Null }
            else { throw 'playwright install chromium failed.' }
        }
    }
}

Push-Location $RepoRoot
try {
    # 1. Plugin validation (manifest + every SKILL.md).
    if ($SkipValidate) {
        Add-SkippedSuite 'Plugin validation' 'python scripts/build-plugin.py validate' '-SkipValidate'
    }
    else {
        Invoke-Suite 'Plugin validation' 'python scripts/build-plugin.py validate' -CountPattern 'skill OK:' {
            $py = Get-Command python -ErrorAction SilentlyContinue
            if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
            if (-not $py) { throw 'Python was not found on PATH; skip with -SkipValidate.' }
            & $py.Source scripts/build-plugin.py validate
        }
    }

    # 2. Canvas extension test suite.
    if ($SkipCanvas) {
        Add-SkippedSuite 'Canvas extension' 'npm test' '-SkipCanvas'
    }
    else {
        Invoke-Suite 'Canvas extension' 'npm test' {
            if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
                throw 'Node.js was not found on PATH.'
            }
            npm test --prefix $CanvasDir
        }
    }

    # 3. Skill eval deterministic tests (offline).
    if ($SkipEvals) {
        Add-SkippedSuite 'Skill evals' 'pwsh evals/scripts/run-tests.ps1' '-SkipEvals'
    }
    else {
        Invoke-Suite 'Skill evals' 'pwsh evals/scripts/run-tests.ps1' {
            & (Join-Path $RepoRoot 'evals/scripts/run-tests.ps1')
        }
    }

    # 4. Playwright visual suite — self-contained via the webServer block.
    if ($SkipE2E) {
        Add-SkippedSuite 'Canvas e2e' 'npm run test:e2e' '-SkipE2E'
    }
    else {
        Invoke-Suite 'Canvas e2e' 'npm run test:e2e' {
            if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
                throw 'Node.js was not found on PATH.'
            }
            Install-CanvasDeps -WithBrowser
            npm run test:e2e --prefix $CanvasDir
        }
    }

    # 5 & 6. Provider-gated LLM suites (opt-in, never fail on a missing key).
    $providerKey = Test-ProviderKey
    if (-not $IncludeSkillBehavior) {
        Add-SkippedSuite 'Skill behavior (LLM)' 'npm run test:skill-behavior' 'not requested (-IncludeSkillBehavior)'
        Add-SkippedSuite 'Live skill evals (LLM)' 'node evals/run-evals.mjs' 'not requested (-IncludeSkillBehavior)'
    }
    elseif (-not $providerKey) {
        $why = 'no provider API key set (' + ($ProviderKeys -join ', ') + ')'
        Add-SkippedSuite 'Skill behavior (LLM)' 'npm run test:skill-behavior' $why
        Add-SkippedSuite 'Live skill evals (LLM)' 'node evals/run-evals.mjs' $why
    }
    else {
        Write-Host ''
        Write-Host "  provider key detected: $providerKey" -ForegroundColor DarkGray
        Invoke-Suite 'Skill behavior (LLM)' 'npm run test:skill-behavior' {
            Install-CanvasDeps
            npm run test:skill-behavior --prefix $CanvasDir
        }
        Invoke-Suite 'Live skill evals (LLM)' 'node evals/run-evals.mjs' {
            node (Join-Path $RepoRoot 'evals/run-evals.mjs')
        }
    }
}
finally {
    Pop-Location
    $RunTimer.Stop()
}

# Summary.
Write-Host ''
Write-Host '==================== Summary ====================' -ForegroundColor Cyan
foreach ($r in $results) {
    $label = switch ($r.state) { 'passed' { 'PASS' } 'failed' { 'FAIL' } default { 'SKIP' } }
    $color = switch ($r.state) { 'passed' { 'Green' } 'failed' { 'Red' } default { 'DarkGray' } }
    $counts = if ($r.state -eq 'skipped') { $r.reason } else { "$($r.pass)/$($r.tests) passing" }
    Write-Host ("  [{0}] {1,-24} {2,6}s  {3}" -f $label, $r.name, $r.seconds, $counts) -ForegroundColor $color
}

# Skills Health Dashboard.
if (-not $NoDashboard) {
    $payload = [pscustomobject]@{
        startedAt       = $StartedAt
        durationSeconds = [math]::Round($RunTimer.Elapsed.TotalSeconds, 1)
        suites          = @($results)
    }
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("skills-health-{0}.json" -f [guid]::NewGuid())
    try {
        $payload | ConvertTo-Json -Depth 6 | Set-Content -Path $tmp -Encoding utf8
        Write-Host ''
        node (Join-Path $RepoRoot 'scripts/build-health-dashboard.mjs') --results $tmp
        if ($LASTEXITCODE -eq 0 -and -not $NoOpen) {
            Invoke-Item (Join-Path $RepoRoot 'docs/skills-health.html')
        }
    }
    catch {
        Write-Host "  dashboard generation failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

$failed = @($results | Where-Object { $_.state -eq 'failed' })
$ran = @($results | Where-Object { $_.state -ne 'skipped' })
Write-Host ''
if ($failed.Count -eq 0) {
    Write-Host ("==> All {0} suite(s) passed." -f $ran.Count) -ForegroundColor Green
    exit 0
}
else {
    Write-Host ("==> {0} of {1} suite(s) failed." -f $failed.Count, $ran.Count) -ForegroundColor Red
    exit 1
}
