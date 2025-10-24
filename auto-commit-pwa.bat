@echo off
echo ====================================
echo Auto Commit and Push for PWA Changes
echo ====================================
echo.

REM Get current timestamp for commit message
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

echo Timestamp: %timestamp%
echo.

REM Check if there are any changes to commit
git diff --quiet
if %errorlevel% equ 0 (
    echo No changes detected. Nothing to commit.
    pause
    exit /b 0
)

echo Changes detected. Proceeding with auto-commit...
echo.

REM Add all changes
echo Adding all changes...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to add changes!
    pause
    exit /b %errorlevel%
)

REM Create commit message with timestamp
set "commit_msg=Auto-commit PWA changes - %timestamp%"
echo Commit message: %commit_msg%

REM Commit changes
echo Committing changes...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to commit changes!
    pause
    exit /b %errorlevel%
)

REM Push to remote
echo Pushing to remote repository...
git push origin tpprover
if %errorlevel% neq 0 (
    echo ERROR: Failed to push to remote!
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================
echo Auto-commit completed successfully!
echo ====================================
echo.
echo Changes committed and pushed to tpprover branch.
echo.

REM Optional: Build and deploy PWA
set /p deploy="Deploy to Firebase? (y/n): "
if /i "%deploy%"=="y" (
    echo Building and deploying to Firebase...
    call npm run build
    if %errorlevel% neq 0 (
        echo ERROR: Build failed!
        pause
        exit /b %errorlevel%
    )
    
    call firebase deploy --only hosting --project tpp-splendide
    if %errorlevel% neq 0 (
        echo ERROR: Firebase deploy failed!
        pause
        exit /b %errorlevel%
    )
    
    echo Firebase deployment completed!
)

pause
