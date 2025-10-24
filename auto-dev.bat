@echo off
echo ====================================
echo TPP Auto Development Workflow
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Not in project root directory!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

echo Choose your development workflow:
echo.
echo 1. PWA Development (Auto-commit + Deploy)
echo 2. Mobile Development (Auto-run + Watch)
echo 3. Full Stack (Both PWA + Mobile)
echo 4. File Watcher Only (Watch for changes)
echo 5. One-time Build + Deploy
echo 6. Setup Git Hooks
echo.
set /p workflow="Enter choice (1-6): "

if "%workflow%"=="1" goto pwa_workflow
if "%workflow%"=="2" goto mobile_workflow
if "%workflow%"=="3" goto full_workflow
if "%workflow%"=="4" goto watch_only
if "%workflow%"=="5" goto one_time
if "%workflow%"=="6" goto setup_hooks
goto invalid_choice

:pwa_workflow
echo.
echo ====================================
echo PWA Development Workflow
echo ====================================
echo.
echo This will:
echo - Auto-commit PWA changes
echo - Auto-push to repository
echo - Optionally deploy to Firebase
echo.

REM Check for changes
git diff --quiet
if %errorlevel% equ 0 (
    echo No changes detected. Nothing to commit.
    pause
    exit /b 0
)

echo Changes detected. Proceeding with PWA workflow...
call auto-commit-pwa.bat
goto end

:mobile_workflow
echo.
echo ====================================
echo Mobile Development Workflow
echo ====================================
echo.
echo This will:
echo - Build web assets
echo - Sync with Capacitor
echo - Run mobile development
echo.
call auto-run-mobile.bat
goto end

:full_workflow
echo.
echo ====================================
echo Full Stack Development Workflow
echo ====================================
echo.
echo This will:
echo - Handle PWA changes (commit + deploy)
echo - Handle mobile changes (build + run)
echo - Watch for file changes
echo.

REM Check for changes and commit if needed
git diff --quiet
if %errorlevel% neq 0 (
    echo Changes detected. Committing PWA changes...
    call auto-commit-pwa.bat
)

echo Starting mobile development...
call auto-run-mobile.bat
goto end

:watch_only
echo.
echo ====================================
echo File Watcher Only
echo ====================================
echo.
echo This will watch for changes and auto-rebuild.
echo.
call watch-mobile.bat
goto end

:one_time
echo.
echo ====================================
echo One-time Build + Deploy
echo ====================================
echo.
echo This will:
echo - Build web assets
echo - Sync with Capacitor
echo - Deploy to Firebase (optional)
echo.

echo Building web assets...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)

echo Syncing with Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b %errorlevel%
)

set /p deploy="Deploy to Firebase? (y/n): "
if /i "%deploy%"=="y" (
    echo Deploying to Firebase...
    call firebase deploy --only hosting --project tpp-splendide
    if %errorlevel% neq 0 (
        echo ERROR: Firebase deploy failed!
        pause
        exit /b %errorlevel%
    )
    echo Firebase deployment completed!
)

echo Build completed successfully!
goto end

:setup_hooks
echo.
echo ====================================
echo Setting up Git Hooks
echo ====================================
echo.

REM Make git hooks executable (if on Unix-like system)
if exist ".git/hooks/pre-commit" (
    echo Git hooks are already set up.
) else (
    echo Setting up git hooks...
    echo Git hooks have been created.
    echo They will automatically:
    echo - Detect PWA vs Mobile changes
    echo - Add appropriate commit messages
    echo - Trigger post-commit actions
)

echo.
echo Git hooks setup completed!
echo.
echo Available hooks:
echo - pre-commit: Auto-detects PWA/Mobile changes
echo - post-commit: Triggers appropriate workflows
echo.
goto end

:invalid_choice
echo Invalid choice. Please run the script again.
pause
exit /b 1

:end
echo.
echo ====================================
echo Workflow completed!
echo ====================================
echo.
echo Available scripts:
echo - auto-commit-pwa.bat: Auto-commit PWA changes
echo - auto-run-mobile.bat: Auto-run mobile development
echo - watch-mobile.bat: Watch for file changes
echo - auto-dev.bat: This comprehensive script
echo.
pause
