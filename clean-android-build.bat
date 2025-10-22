@echo off
echo ====================================
echo Cleaning Android Build Cache
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

echo Step 2: Cleaning Capacitor cache...
rmdir /s /q android\app\src\main\assets\public 2>nul
echo.

echo Step 3: Syncing to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b %errorlevel%
)
echo.

echo Step 4: Cleaning Android build directories...
rmdir /s /q android\.gradle 2>nul
rmdir /s /q android\app\build 2>nul
rmdir /s /q android\build 2>nul
echo.

echo Step 5: Cleaning Gradle cache (optional but recommended)...
cd android
call gradlew clean
cd ..
echo.

echo ====================================
echo Clean build complete!
echo ====================================
echo.
echo Next steps:
echo 1. In Android Studio: Build ^> Rebuild Project
echo 2. Run the app
echo.
pause


