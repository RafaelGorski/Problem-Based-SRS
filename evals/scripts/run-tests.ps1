# Run the deterministic skill tests (offline, no model calls).
#
#   pwsh evals/scripts/run-tests.ps1
#   pwsh evals/scripts/run-tests.ps1 -File skills-static.test.mjs
#
# These cover the Copilot SDK wrapper, the SKILL.md loader/graders, and the
# static skill evals over the consolidated skills/problem-based-srs/ skill. No Copilot login needed.

[CmdletBinding()]
param(
    # Optional single test file (relative to evals/tests) to run.
    [string]$File,
    # Per-test timeout in milliseconds.
    [int]$TimeoutMs = 20000
)

$ErrorActionPreference = 'Stop'

# evals/ root (parent of this scripts/ folder).
$EvalsDir = Split-Path -Parent $PSScriptRoot
Push-Location $EvalsDir
try {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Error 'Node.js is required but was not found on PATH.'
        exit 127
    }

    Write-Host "==> Running deterministic skill tests" -ForegroundColor Cyan
    Write-Host "    dir: $EvalsDir`n" -ForegroundColor DarkGray

    if ($File) {
        $targets = @((Join-Path 'tests' $File))
    } else {
        $targets = Get-ChildItem -Path 'tests' -Filter '*.test.mjs' | ForEach-Object { Join-Path 'tests' $_.Name }
    }
    node --test "--test-timeout=$TimeoutMs" @targets
    $code = $LASTEXITCODE

    Write-Host ''
    if ($code -eq 0) {
        Write-Host '==> All tests passed.' -ForegroundColor Green
    } else {
        Write-Host "==> Tests failed (exit $code)." -ForegroundColor Red
    }
    exit $code
}
finally {
    Pop-Location
}
