# Run the live LLM skill evals through the GitHub Copilot CLI (opt-in).
#
#   pwsh evals/scripts/run-evals.ps1                    # all cases
#   pwsh evals/scripts/run-evals.ps1 -Case customer-needs
#   pwsh evals/scripts/run-evals.ps1 -NoJudge          # rubric only, skip LLM judge
#   pwsh evals/scripts/run-evals.ps1 -Model gpt-5.4
#   pwsh evals/scripts/run-evals.ps1 -Detailed      # verbose: show prompt, artifact, every check
#   pwsh evals/scripts/run-evals.ps1 -Trace         # extra verbose: full prompt + full artifact
#
# WARNING: these call the real model and may consume premium requests.
# They require the `copilot` CLI to be installed and authenticated.

[CmdletBinding()]
param(
    # Run only the named case (e.g. customer-problems, customer-needs, functional-requirements).
    [string]$Case,
    # Skip the qualitative LLM judge; grade with the deterministic rubric only.
    [switch]$NoJudge,
    # Model override passed to the Copilot CLI.
    [string]$Model,
    # Per-call timeout in seconds.
    [int]$TimeoutSec = 240,
    # Verbose eval output: prompt, run metadata (usage/tools/stderr), artifact, and every rubric check.
    [switch]$Detailed,
    # Even more verbose: do not truncate the prompt or the artifact.
    [switch]$Trace
)

$ErrorActionPreference = 'Stop'

$EvalsDir = Split-Path -Parent $PSScriptRoot
Push-Location $EvalsDir
try {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Error 'Node.js is required but was not found on PATH.'
        exit 127
    }

    $copilot = Get-Command copilot -ErrorAction SilentlyContinue
    if (-not $copilot) {
        Write-Error 'The `copilot` CLI (@github/copilot) was not found on PATH. Install and authenticate it to run live evals.'
        exit 127
    }

    Write-Host "==> Running LIVE skill evals via the Copilot CLI" -ForegroundColor Cyan
    Write-Host "    These call the real model and may consume premium requests.`n" -ForegroundColor Yellow

    # Opt-in gate consumed by run-evals.mjs.
    $env:RUN_SKILL_EVALS = '1'

    $argsList = @('run-evals.mjs', '--force')
    if ($Case)    { $argsList += $Case }
    if ($NoJudge) { $argsList += '--no-judge' }
    if ($Model)   { $argsList += @('--model', $Model) }
    if ($Trace)   { $argsList += '-vv' }
    elseif ($Detailed) { $argsList += '--verbose' }
    $argsList += @('--timeout', "$TimeoutSec")

    node @argsList
    $code = $LASTEXITCODE

    Write-Host ''
    if ($code -eq 0) {
        Write-Host '==> All evals passed.' -ForegroundColor Green
    } else {
        Write-Host "==> Evals failed (exit $code)." -ForegroundColor Red
    }
    exit $code
}
finally {
    Pop-Location
}
