# Run every test suite in the repository.
#
#   pwsh run-tests.ps1                 # run all suites
#   pwsh run-tests.ps1 -SkipCanvas     # skip the canvas extension suite
#   pwsh run-tests.ps1 -SkipEvals      # skip the skill-eval deterministic suite
#   pwsh run-tests.ps1 -SkipValidate   # skip the plugin manifest/skill validation
#
# Suites:
#   1. Plugin validation  — scripts/build-plugin.py validate (manifest + skills)
#   2. Canvas extension   — .github/extensions/srs-navigator (node --test)
#   3. Skill evals        — evals/ deterministic tests (node --test, offline)
#
# Live LLM evals are NOT run here (they call the model and are opt-in);
# use evals/scripts/run-evals.ps1 for those.

[CmdletBinding()]
param(
    [switch]$SkipValidate,
    [switch]$SkipCanvas,
    [switch]$SkipEvals
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot

$results = [System.Collections.Generic.List[object]]::new()

function Invoke-Suite {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host ''
    Write-Host "==================== $Name ====================" -ForegroundColor Cyan
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        & $Action
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }
    }
    catch {
        Write-Host $_.Exception.Message -ForegroundColor Red
        $code = 1
    }
    $sw.Stop()
    $script:results.Add([pscustomobject]@{
        Suite    = $Name
        ExitCode = $code
        Passed   = ($code -eq 0)
        Seconds  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
    })
}

Push-Location $RepoRoot
try {
    # 1. Plugin validation (manifest + every SKILL.md).
    if (-not $SkipValidate) {
        Invoke-Suite 'Plugin validation' {
            $py = Get-Command python -ErrorAction SilentlyContinue
            if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
            if (-not $py) { throw 'Python was not found on PATH; skip with -SkipValidate.' }
            & $py.Source scripts/build-plugin.py validate
        }
    }

    # 2. Canvas extension test suite.
    if (-not $SkipCanvas) {
        Invoke-Suite 'Canvas extension (srs-navigator)' {
            if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
                throw 'Node.js was not found on PATH.'
            }
            Push-Location (Join-Path $RepoRoot '.github/extensions/srs-navigator')
            try { npm test } finally { Pop-Location }
        }
    }

    # 3. Skill eval deterministic tests (offline).
    if (-not $SkipEvals) {
        Invoke-Suite 'Skill evals (deterministic)' {
            & (Join-Path $RepoRoot 'evals/scripts/run-tests.ps1')
        }
    }
}
finally {
    Pop-Location
}

# Summary.
Write-Host ''
Write-Host '==================== Summary ====================' -ForegroundColor Cyan
foreach ($r in $results) {
    $label = if ($r.Passed) { 'PASS' } else { 'FAIL' }
    $color = if ($r.Passed) { 'Green' } else { 'Red' }
    Write-Host ("  [{0}] {1,-34} {2,5}s" -f $label, $r.Suite, $r.Seconds) -ForegroundColor $color
}

$failed = @($results | Where-Object { -not $_.Passed })
Write-Host ''
if ($failed.Count -eq 0) {
    Write-Host ("==> All {0} suite(s) passed." -f $results.Count) -ForegroundColor Green
    exit 0
} else {
    Write-Host ("==> {0} of {1} suite(s) failed." -f $failed.Count, $results.Count) -ForegroundColor Red
    exit 1
}
