# PowerShell script to help test worktrees
# Usage: .\test-worktree.ps1 [worktree-name]

param(
    [Parameter(Mandatory=$true)]
    [string]$WorktreeName
)

$worktreePath = "C:\Users\lebro\.cursor\worktrees\TPPSpendide\$WorktreeName"

if (-not (Test-Path $worktreePath)) {
    Write-Host "❌ Worktree '$WorktreeName' not found!" -ForegroundColor Red
    Write-Host "Available worktrees:" -ForegroundColor Yellow
    git worktree list
    exit 1
}

Write-Host "📁 Switching to worktree: $WorktreeName" -ForegroundColor Cyan
Write-Host "Path: $worktreePath" -ForegroundColor Gray

# Navigate to worktree
Set-Location $worktreePath

# Show status
Write-Host "`n📊 Git Status:" -ForegroundColor Yellow
git status

# Show summary of changes
Write-Host "`n📝 Changes Summary:" -ForegroundColor Yellow
$changedFiles = git diff --name-only
if ($changedFiles) {
    Write-Host "Modified files:" -ForegroundColor Green
    $changedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
} else {
    Write-Host "No changes detected" -ForegroundColor Gray
}

# Ask if user wants to see full diff
$showDiff = Read-Host "`nShow full diff? (y/n)"
if ($showDiff -eq 'y') {
    git diff
}

# Ask if user wants to run dev server
$runDev = Read-Host "`nRun dev server? (y/n)"
if ($runDev -eq 'y') {
    Write-Host "`n🚀 Starting dev server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    npm run dev
}

Write-Host "`n✅ Done!" -ForegroundColor Green



