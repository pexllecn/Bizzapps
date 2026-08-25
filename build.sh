#!/usr/bin/env bash
# Assemble the isometric Power Platform showcase into:
#   index.html     – full standalone document (open by double-click, offline-ok)
#   artifact.html  – body-only build for publishing as a Claude Artifact
# Pure SVG/JS — no third-party libraries.
set -euo pipefail
cd "$(dirname "$0")"

FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'

emit_scripts () {
  echo "<script>"; cat src/ms-data.js;  echo ""; echo "</script>"
  echo "<script>"; cat src/ms-icons.js; echo ""; echo "</script>"
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
