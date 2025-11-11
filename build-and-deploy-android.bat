@echo off
echo ====================================
echo Full Clean Build and Deploy to Android
echo ====================================
echo.

echo Step 1: Building fresh web assets...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b %errorlevel%
)
echo.

echo Step 2: Force clean Android assets...
rmdir /s /q android\app\src\main\assets\public 2>nul
echo Android assets cleaned.
echo.

echo Step 3: Syncing to Android with fresh copy...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b %errorlevel%
)
echo.

echo Step 4: Cleaning Android build cache...
cd android
call gradlew clean
cd ..
echo.

echo ====================================
echo Build deployed successfully!
echo ====================================
echo.
echo Android Studio will now open.
echo IMPORTANT: In Android Studio, do:
echo   1. File ^> Invalidate Caches / Restart
echo   2. Build ^> Rebuild Project
echo   3. Run the app
echo.

call npx cap open android

pause


