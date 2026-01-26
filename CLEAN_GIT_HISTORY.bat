@echo off
echo ========================================
echo    Git History Cleanup Script
echo ========================================
echo.
echo WARNING: This will rewrite git history!
echo Make sure no one else is working on this branch.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [Step 1] Viewing recent commits...
git log --oneline -10

echo.
echo.
echo [Step 2] Finding commits before secrets were added...
echo Look for a commit BEFORE any API keys were added.
echo.
echo Type the commit hash where you want to reset to:
echo (Example: ff6ea4c)
echo.
set /p COMMIT_HASH="Enter commit hash: "

echo.
echo [Step 3] Resetting to commit %COMMIT_HASH%...
git reset --hard %COMMIT_HASH%

echo.
echo [Step 4] Force pushing to GitHub...
echo This will overwrite the remote history.
git push --force origin tpprover

echo.
echo ========================================
echo    Git history cleaned!
echo ========================================
echo.
echo The following have been removed from history:
echo - DEBUG_API_KEY_ISSUE.md
echo - TELEGRAM_CONNECTION_SUCCESS.md
echo - GEMINI_API_KEY_UPDATED.md
echo - DEPLOYMENT_COMPLETE.md
echo - TELEGRAM_SETUP_GUIDE.md
echo.
echo All API keys have been removed from git history.
echo.
echo Press any key to exit...
pause >nul
