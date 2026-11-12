@echo off
title ECE Daily News - Phone & Live Sharing Launcher
cd /d "C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

echo ======================================================================
echo           ECE DAILY NEWS - PHONE ^& LIVE SHARING SERVER
echo ======================================================================
echo.
echo  [+] Local Wi-Fi Address:
echo      http://192.168.29.37:8080
echo.
echo  [+] Live Public HTTPS Link (Works anywhere, 4G / 5G / Wi-Fi):
echo      https://1dcfec5261427d.lhr.life
echo.
echo  Starting local server... Press Ctrl+C to stop.
echo ======================================================================
echo.

python -m http.server 8080
