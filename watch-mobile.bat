@echo off
echo ====================================
echo Mobile File Watcher
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Not in project root directory!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

echo Starting mobile file watcher...
echo Watching for changes in:
echo - src/ directory (PWA changes)
echo - android/ directory (Android changes)
echo - ios/ directory (iOS changes)
echo - capacitor.config.json
echo.

echo Press Ctrl+C to stop watching
echo.

REM Create a temporary file to track last build time
set "last_build_file=%temp%\tpp_mobile_last_build.txt"
echo 0 > "%last_build_file%"

:watch_loop
REM Check for changes in key directories
for /f %%i in ('dir /s /b src\*.* android\*.* ios\*.* capacitor.config.json 2^>nul ^| find /c /v ""') do set "file_count=%%i"

REM Get current timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "current_time=%dt:~8,2%%dt:~10,2%%dt:~12,2%"

REM Read last build time
set /p last_build=<"%last_build_file%"

REM Check if enough time has passed since last build (prevent rapid rebuilds)
set /a time_diff=%current_time%-%last_build%
if %time_diff% lss 30 (
    timeout /t 2 /nobreak >nul
    goto watch_loop
)

REM Check for actual file changes by comparing timestamps
for /f "tokens=*" %%f in ('dir /s /b src\*.* android\*.* ios\*.* capacitor.config.json 2^>nul') do (
    for /f "tokens=1-3" %%a in ('forfiles /p "%%f" /m *.* /c "cmd /c echo @ftime" 2^>nul') do (
        set "file_time=%%a%%b%%c"
        if "%%file_time" gtr "%last_build%" (
            echo.
            echo 🔄 Change detected: %%f
            echo Time: %current_time%
            goto rebuild
        )
    )
)

timeout /t 2 /nobreak >nul
goto watch_loop

:rebuild
echo.
echo ====================================
echo Changes detected! Rebuilding...
echo ====================================
echo.

REM Update last build time
echo %current_time% > "%last_build_file%"

REM Build web assets
echo Step 1: Building web assets...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Web build failed!
    timeout /t 5 /nobreak >nul
    goto watch_loop
)
echo ✅ Web build completed.

REM Sync with Capacitor
echo Step 2: Syncing with Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ Capacitor sync failed!
    timeout /t 5 /nobreak >nul
    goto watch_loop
)
echo ✅ Capacitor sync completed.

REM Ask user what to do next
echo.
echo ====================================
echo Build completed! What would you like to do?
echo ====================================
echo 1. Run Android
echo 2. Run iOS  
echo 3. Open Android Studio
echo 4. Open Xcode
echo 5. Continue watching (do nothing)
echo.
set /p action="Enter choice (1-5): "

if "%action%"=="1" (
    echo Running Android...
    start /b npx cap run android
) else if "%action%"=="2" (
    echo Running iOS...
    start /b npx cap run ios
) else if "%action%"=="3" (
    echo Opening Android Studio...
    start /b npx cap open android
) else if "%action%"=="4" (
    echo Opening Xcode...
    start /b npx cap open ios
) else if "%action%"=="5" (
    echo Continuing to watch for changes...
) else (
    echo Invalid choice. Continuing to watch...
)

echo.
echo 🔍 Watching for changes again...
timeout /t 2 /nobreak >nul
goto watch_loop
