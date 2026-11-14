@echo off
title Push ECE Daily News to GitHub
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

echo ======================================================================
echo           PUSHING ECE DAILY NEWS TO GITHUB
echo           Target: https://github.com/prajan1504009-ctrl/ece-daily-news
echo ======================================================================
echo.
echo  A browser window or GitHub sign-in prompt will open.
echo  Click "Sign in with your browser" to authorize the upload.
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  ======================================================================
    echo  SUCCESS! Pushed to GitHub.
    echo  Your site is now connected to GitHub Actions cloud automation!
    echo  ======================================================================
) else (
    echo.
    echo  Push was not completed.
)

echo.
pause
