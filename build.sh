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
      case "$file" in
        *.png)        mime="image/png" ;;
        *.webp)       mime="image/webp" ;;
        *.jpg|*.jpeg) mime="image/jpeg" ;;
        *)            mime="image/svg+xml" ;;
      esac
      b64=$(base64 -w0 "icons/$file")
      echo "window.ICONS[\"$id\"]=\"data:$mime;base64,$b64\";"
    fi
  done <<'MAP'
microsoft|brand-microsoft.svg
ey|brand-ey.svg
doj-crest|DOJ logo.png
dynamics365|Dynamics365_scalable.svg
d365-contact-center|ContactCenter_scalable.svg
d365-customer-service|CustomerServices_scalable.svg
d365-field-service|FieldService_scalable.svg
d365-sales|Sales_scalable.svg
d365-project-ops|ProjectOperations_scalable.svg
power-apps|PowerApps_scalable.svg
power-automate|PowerAutomate_scalable.svg
power-pages|PowerPages_scalable.svg
power-platform|PowerPlatform_scalable.svg
power-bi|500px-New_Power_BI_Logo.svg.webp
dataverse|Dataverse_scalable.svg
copilot|microsoft-copilot.svg
copilot-studio|microsoft-copilot.svg
azure|Microsoft_Azure.svg
azure-ai|Microsoft_Azure.svg
fabric|Fabric_final_x256.png
purview|500px-Microsoft_Purview_Logo.svg.webp
teams|teams-svgrepo-com.svg
sharepoint|ms-sharepoint-svgrepo-com.svg
m365|500px-Microsoft_365_(2022).svg.webp
iso-civic|iso-civic.png
iso-portal|iso-portal.png
iso-foundry|iso-foundry.png
iso-spire|iso-spire.png
iso-vault|iso-vault.png
iso-depot|iso-depot.png
iso-control|iso-control.png
iso-datahouse|iso-datahouse.png
iso-dataverse-core|iso-dataverse-core.png
MAP
  echo "</script>"
}

emit_scripts () {
  echo "<script>"; cat src/ms-data.js;             echo ""; echo "</script>"
  emit_icons
  echo "<script>"; cat src/logos.js;                echo ""; echo "</script>"
  echo "<script>"; cat src/content-visibility.js;   echo ""; echo "</script>"
  echo "<script>"; cat src/ms-iso.js;               echo ""; echo "</script>"
}

# ---- artifact.html (no doctype/html/head/body — the platform wraps it) ----
{
  echo '<title>EY · Microsoft Business Applications</title>'
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
  echo '<title>EY · Microsoft Business Applications</title>'
  echo "$FONTS"
  echo '<style>'; cat src/ms-styles.css; echo '</style>'
  echo '</head><body>'
  cat src/ms-body.html
  emit_scripts
  echo '</body></html>'
} > index.html

echo "Built:"; wc -c index.html artifact.html
