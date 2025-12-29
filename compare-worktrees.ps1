# PowerShell script to compare worktrees
# Usage: .\compare-worktrees.ps1 [worktree1] [worktree2]

param(
    [Parameter(Mandatory=$false)]
    [string]$Worktree1 = "asf",
    
    [Parameter(Mandatory=$false)]
    [string]$Worktree2 = "ydq"
)

$basePath = "C:\Users\lebro\.cursor\worktrees\TPPSpendide"
$path1 = "$basePath\$Worktree1"
$path2 = "$basePath\$Worktree2"

Write-Host "🔍 Comparing worktrees:" -ForegroundColor Cyan
Write-Host "  Worktree 1: $Worktree1" -ForegroundColor Yellow
Write-Host "  Worktree 2: $Worktree2" -ForegroundColor Yellow

if (-not (Test-Path $path1)) {
    Write-Host "❌ Worktree '$Worktree1' not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $path2)) {
    Write-Host "❌ Worktree '$Worktree2' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Files changed in $Worktree1:" -ForegroundColor Green
Set-Location $path1
$files1 = git diff --name-only
if ($files1) {
    $files1 | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
} else {
    Write-Host "  (no changes)" -ForegroundColor Gray
}

Write-Host "`n📊 Files changed in $Worktree2:" -ForegroundColor Green
Set-Location $path2
$files2 = git diff --name-only
if ($files2) {
    $files2 | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
} else {
    Write-Host "  (no changes)" -ForegroundColor Gray
}

# Find common files
$commonFiles = Compare-Object $files1 $files2 -IncludeEqual -ExcludeDifferent | Where-Object { $_.SideIndicator -eq '==' } | ForEach-Object { $_.InputObject }

if ($commonFiles) {
    Write-Host "`n🔄 Files changed in both worktrees:" -ForegroundColor Yellow
    $commonFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    
    Write-Host "`n⚠️  These files have changes in both worktrees - you'll need to merge carefully!" -ForegroundColor Red
}

# Show diff between worktrees
Write-Host "`n📝 Diff between worktrees:" -ForegroundColor Cyan
Set-Location $path1
git diff $path2

Write-Host "`n✅ Comparison complete!" -ForegroundColor Green

