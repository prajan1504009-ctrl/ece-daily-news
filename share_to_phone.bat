@echo off
title ECE Daily News - Phone & Local Wi-Fi Sharing Server
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

echo ======================================================================
echo           ECE DAILY NEWS - PHONE ^& LOCAL SHARING SERVER
echo ======================================================================
echo.
echo  Your Local Wi-Fi IP is: 192.168.29.37
echo.
echo  [+] Anyone connected to the same Wi-Fi or mobile hotspot can open:
echo      http://192.168.29.37:8080
echo.
echo  [+] Or scan the QR code from the "Phone & Share" button on the website!
echo.
echo  Press Ctrl+C to stop the server anytime.
echo ======================================================================
echo.

python -m http.server 8080
