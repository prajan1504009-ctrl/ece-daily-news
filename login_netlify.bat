@echo off
title Connect Netlify CLI for Daily Auto-Deploy
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

echo ======================================================================
echo          AUTHORIZE NETLIFY FOR AUTOMATIC DAILY 5:00 AM DEPLOYS
echo ======================================================================
echo.
echo  A browser window will open asking you to Authorize Netlify CLI.
echo  Click "Authorize" to give your computer permission to auto-deploy
echo  the latest ECE news every day at 5:00 AM IST.
echo.
echo ======================================================================
echo.

npx netlify login

echo.
echo  Linking site daily-ece-news...
npx netlify link --id c9eb40d9-6123-4002-b916-1808d7c7a5ff

echo.
echo  ======================================================================
echo  Setup complete! Your site will now auto-deploy every day at 5:00 AM IST.
echo  ======================================================================
pause
