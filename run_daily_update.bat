@echo off
REM ECE Daily News 5:00 PM IST Automated Updater & Netlify Deployer
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

echo ============================================================ >> "data\update_log.txt"
echo Running ECE Daily News 5:00 PM IST Scheduled Update >> "data\update_log.txt"
echo Execution Time: %DATE% %TIME% >> "data\update_log.txt"
echo ============================================================ >> "data\update_log.txt"

REM 1. Fetch, synthesize, and bundle today's news
"C:\Users\wolfy\AppData\Local\Programs\Python\Python315\python.exe" "update_news.py" >> "data\update_log.txt" 2>&1

REM 2. Automatically deploy the new edition to Netlify via Auth Token
echo Deploying new edition to Netlify (daily-ece-news.netlify.app)... >> "data\update_log.txt"
call npx netlify deploy --site c9eb40d9-6123-4002-b916-1808d7c7a5ff --dir . --prod --auth nfp_kKVMfui7AtBv48fbMvjzqhFAKMsse4Htb569 >> "data\update_log.txt" 2>&1

echo Finished scheduled update at %DATE% %TIME% >> "data\update_log.txt"
