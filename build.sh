#!/usr/bin/env bash
# Assemble the isometric Power Platform showcase into:
#   index.html     – full standalone document (open by double-click, offline-ok)
#   artifact.html  – body-only build for publishing as a Claude Artifact
# Pure SVG/JS — no third-party libraries.
set -euo pipefail
cd "$(dirname "$0")"

FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'

# Embed the real product / brand icons from icons/ as inlined data URIs
# (keeps the page self-contained). id|filename — missing ids fall back to a
# built-in drawn mark; missing files are simply skipped.
emit_icons () {
  echo "<script>window.ICONS=window.ICONS||{};"
  while IFS='|' read -r id file; do
    [ -z "$id" ] && continue
    if [ -f "icons/$file" ]; then
      b64=$(base64 -w0 "icons/$file")
      echo "window.ICONS[\"$id\"]=\"data:image/svg+xml;base64,$b64\";"
    fi
  done <<'MAP'
dataverse|Dataverse_scalable.svg
powerapps|PowerApps_scalable.svg
powerautomate|PowerAutomate_scalable.svg
powerpages|PowerPages_scalable.svg
dynamics|Dynamics365_scalable.svg
copilot|microsoft-copilot.svg
powerplatform|PowerPlatform_scalable.svg
fieldservice|FieldService_scalable.svg
sales|Sales_scalable.svg
customerservice|CustomerServices_scalable.svg
contactcenter|ContactCenter_scalable.svg
projectops|ProjectOperations_scalable.svg
microsoft|brand-microsoft.svg
ey|brand-ey.svg
MAP
  echo "</script>"
}

emit_scripts () {
  echo "<script>"; cat src/ms-data.js;  echo ""; echo "</script>"
  emit_icons
  echo "<script>"; cat src/ms-iso.js;   echo ""; echo "</script>"
}

# ---- artifact.html (no doctype/html/head/body — the platform wraps it) ----
{
  echo '<title>Power Platform Landscape</title>'
  echo "$FONTS"
  echo '<style>'; cat src/ms-styles.css; echo '</style>'
  cat src/ms-body.html
  emit_scripts
} > artifact.html

# ---- index.html (full standalone document) ----
{
  echo '<!doctype html>'
  echo '<html lang="en"><head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<title>Power Platform Landscape · Bizzapps</title>'
  echo "$FONTS"
  echo '<style>'; cat src/ms-styles.css; echo '</style>'
  echo '</head><body>'
  cat src/ms-body.html
  emit_scripts
  echo '</body></html>'
} > index.html

echo "Built:"; wc -c index.html artifact.html
