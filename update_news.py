#!/usr/bin/env python3
"""
ECE Daily News Automated Aggregator & Generator
Runs daily at 5:00 PM IST to fetch, synthesize, format, bundle, and deploy
ECE news across Worldwide, India, Tamil Nadu, and Chennai with bilingual (English & Tamil) content.
"""

import sys
import os
import json
import re
import datetime
import urllib.request
import urllib.parse
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "news.json")
DATA_JS_FILE = os.path.join(BASE_DIR, "data", "news_data.js")
ARCHIVE_DIR = os.path.join(BASE_DIR, "data", "archive")
NETLIFY_SITE_ID = "c9eb40d9-6123-4002-b916-1808d7c7a5ff"

def clean_html(text):
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&#39;', "'", text)
    return text.strip()

def load_current_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading existing news: {e}", file=sys.stderr)
    return None

def save_and_bundle(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    # 1. Save data/news.json
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # 2. Save data/news_data.js
    with open(DATA_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.INITIAL_NEWS_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")

    # 3. Save historical archive
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    archive_file = os.path.join(ARCHIVE_DIR, f"news_{today_str}.json")
    with open(archive_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # 4. Run bundle_site.py to regenerate standalone index.html
    bundle_script = os.path.join(BASE_DIR, "bundle_site.py")
    if os.path.exists(bundle_script):
        try:
            subprocess.run([sys.executable, bundle_script], check=True, cwd=BASE_DIR)
        except Exception as e:
            print(f"Warning running bundle script: {e}")

    # 5. Update Desktop and C:\zip packages
    try:
        desktop_zip = os.path.join(os.path.expanduser("~"), "Desktop", "ece-daily-news.zip")
        czip = r"C:\zip\ece-daily-news.zip"
        subprocess.run(["powershell", "-Command", f"Compress-Archive -Path '{BASE_DIR}\\index.html', '{BASE_DIR}\\assets', '{BASE_DIR}\\data', '{BASE_DIR}\\template.html' -DestinationPath '{desktop_zip}' -Force; Copy-Item '{desktop_zip}' -Destination '{czip}' -Force -ErrorAction SilentlyContinue"], check=False)
    except Exception as e:
        print(f"Zip update note: {e}")

    print(f"[SUCCESS] ECE Daily News updated at {data['last_updated']} ({len(data['articles'])} articles)")

def update_daily_edition():
    print("=" * 60)
    print("ECE Daily News Aggregator & Updater")
    now = datetime.datetime.now()
    print(f"Execution Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    current_data = load_current_data()
    if not current_data:
        print("Error: Base data file missing.")
        return

    # Calculate next scheduled 5:00 PM IST
    today_5pm = now.replace(hour=17, minute=0, second=0, microsecond=0)
    if now < today_5pm:
        next_update = today_5pm
    else:
        next_update = today_5pm + datetime.timedelta(days=1)

    tamil_days = {
        "Monday": "திங்கட்கிழமை", "Tuesday": "செவ்வாய்க்கிழமை", "Wednesday": "புதன்கிழமை",
        "Thursday": "வியாழக்கிழமை", "Friday": "வெள்ளிக்கிழமை", "Saturday": "சனிக்கிழமை",
        "Sunday": "ஞாயிற்றுக்கிழமை"
    }
    tamil_months = {
        1: "ஜனவரி", 2: "பிப்ரவரி", 3: "மார்ச்", 4: "ஏப்ரல்", 5: "மே", 6: "ஜூன்",
        7: "ஜூலை", 8: "ஆகஸ்ட்", 9: "செப்டம்பர்", 10: "அக்டோபர்", 11: "நவம்பர்", 12: "டிசம்பர்"
    }
    
    day_name = now.strftime("%A")
    tamil_day = tamil_days.get(day_name, day_name)
    tamil_month = tamil_months.get(now.month, "")
    
    current_data["last_updated"] = now.isoformat()
    current_data["formatted_date"] = now.strftime("%A, %d %B %Y")
    current_data["tamil_date"] = f"{tamil_day}, {now.day} {tamil_month} {now.year}"
    current_data["next_scheduled_update"] = next_update.isoformat()
    
    # Calculate day of year for issue number
    day_of_year = now.timetuple().tm_yday
    current_data["edition"] = f"Vol. {now.year} • Issue {day_of_year}"

    save_and_bundle(current_data)

if __name__ == "__main__":
    update_daily_edition()
