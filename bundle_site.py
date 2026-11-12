import os
import json

base_dir = r"C:\Users\wolfy\.gemini\antigravity\scratch\ece-daily-news"

with open(os.path.join(base_dir, "template.html"), "r", encoding="utf-8") as f:
    template_html = f.read()

with open(os.path.join(base_dir, "assets", "style.css"), "r", encoding="utf-8") as f:
    css_content = f.read()

with open(os.path.join(base_dir, "data", "news.json"), "r", encoding="utf-8") as f:
    news_json_data = json.load(f)

# Also ensure data/news_data.js is refreshed
news_data_js = f"window.INITIAL_NEWS_DATA = {json.dumps(news_json_data, indent=2, ensure_ascii=False)};"
with open(os.path.join(base_dir, "data", "news_data.js"), "w", encoding="utf-8") as f:
    f.write(news_data_js + "\n")

with open(os.path.join(base_dir, "assets", "illustrations.js"), "r", encoding="utf-8") as f:
    illustrations_js = f.read()

with open(os.path.join(base_dir, "assets", "circuit.js"), "r", encoding="utf-8") as f:
    circuit_js = f.read()

with open(os.path.join(base_dir, "assets", "app.js"), "r", encoding="utf-8") as f:
    app_js = f.read()

# Replace CSS link
html = template_html.replace(
    '<link rel="stylesheet" href="assets/style.css">',
    f'<style>\n{css_content}\n</style>'
)

# Replace script tags with inlined scripts
old_scripts = """  <!-- Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="data/news_data.js"></script>
  <script src="assets/illustrations.js"></script>
  <script src="assets/circuit.js"></script>
  <script src="assets/app.js"></script>"""

new_scripts = f"""  <!-- Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
{news_data_js}
{illustrations_js}
{circuit_js}
{app_js}
  </script>"""

html = html.replace(old_scripts, new_scripts)

# Update date placeholders from news_json_data
formatted_date = news_json_data.get("formatted_date", "Thursday, 12 November 2026")
tamil_date = news_json_data.get("tamil_date", "வியாழக்கிழமை, 12 நவம்பர் 2026")
edition = news_json_data.get("edition", "Vol. 2026 • Issue 316")

html = html.replace("Thursday, 12 November 2026", formatted_date)
html = html.replace("வியாழக்கிழமை, 12 நவம்பர் 2026", tamil_date)

with open(os.path.join(base_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)

print(f"Bundled index.html successfully! Size: {len(html)} bytes ({formatted_date})")
