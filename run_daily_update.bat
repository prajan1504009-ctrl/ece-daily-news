@echo off
REM ECE Daily News 5:00 PM IST Automated Updater
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"
"C:\Users\wolfy\AppData\Local\Programs\Python\Python315\python.exe" "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news\update_news.py" --force >> "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news\data\update_log.txt" 2>&1
