@echo off
echo ====================================
echo Auto Run Mobile Development
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Not in project root directory!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

echo Starting mobile development workflow...
echo.

REM Step 1: Build web assets
echo Step 1: Building web assets...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b %errorlevel%
)
echo Web build completed successfully.
echo.

REM Step 2: Sync with Capacitor
echo Step 2: Syncing with Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b %errorlevel%
)
echo Capacitor sync completed successfully.
echo.

REM Step 3: Ask user which platform to run
echo Choose platform to run:
echo 1. Android
echo 2. iOS
echo 3. Both (Android first, then iOS)
echo 4. Open IDE only (no run)
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto run_android
if "%choice%"=="2" goto run_ios
if "%choice%"=="3" goto run_both
if "%choice%"=="4" goto open_ide
goto invalid_choice

:run_android
echo.
echo Running Android development...
call npx cap run android
if %errorlevel% neq 0 (
    echo ERROR: Android run failed!
    pause
    exit /b %errorlevel%
)
goto end

:run_ios
echo.
echo Running iOS development...
call npx cap run ios
if %errorlevel% neq 0 (
    echo ERROR: iOS run failed!
    pause
    exit /b %errorlevel%
)
goto end

:run_both
echo.
echo Running Android first...
call npx cap run android
if %errorlevel% neq 0 (
    echo ERROR: Android run failed!
    pause
    exit /b %errorlevel%
)
echo.
echo Android completed. Starting iOS...
call npx cap run ios
if %errorlevel% neq 0 (
    echo ERROR: iOS run failed!
    pause
    exit /b %errorlevel%
)
goto end

:open_ide
echo.
echo Opening IDE...
echo Choose IDE to open:
echo 1. Android Studio
echo 2. Xcode
echo 3. Both
echo.
set /p ide_choice="Enter choice (1-3): "

if "%ide_choice%"=="1" (
    call npx cap open android
) else if "%ide_choice%"=="2" (
    call npx cap open ios
) else if "%ide_choice%"=="3" (
    call npx cap open android
    call npx cap open ios
) else (
    echo Invalid choice. Opening Android Studio by default.
    call npx cap open android
)
goto end

:invalid_choice
echo Invalid choice. Please run the script again.
pause
exit /b 1

:end
echo.
echo ====================================
echo Mobile development workflow completed!
echo ====================================
echo.
pause
