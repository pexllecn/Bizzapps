#!/usr/bin/env bash
# Assemble the source + vendored libraries into two self-contained outputs:
#   index.html     – full standalone document (open by double-click, offline-ok)
#   artifact.html  – body-only build for publishing as a Claude Artifact
set -euo pipefail
cd "$(dirname "$0")"

FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">'

VENDOR=(
  vendor/three.min.js
  vendor/CopyShader.js
  vendor/LuminosityHighPassShader.js
  vendor/EffectComposer.js
  vendor/RenderPass.js
  vendor/ShaderPass.js
  vendor/UnrealBloomPass.js
  vendor/OrbitControls.js
)

emit_scripts () {
  for f in "${VENDOR[@]}"; do
    echo "<script>"; cat "$f"; echo ""; echo "</script>"
  done
  echo "<script>"; cat src/data.js; echo ""; echo "</script>"
  echo "<script>"; cat src/app.js;  echo ""; echo "</script>"
}

# ---- artifact.html (no doctype/html/head/body – the platform wraps it) ----
{
  echo '<title>Bizzapps City</title>'
  echo "$FONTS"
  echo '<style>'; cat src/styles.css; echo '</style>'
  cat src/body.html
  emit_scripts
} > artifact.html

# ---- index.html (full standalone document) ----
{
  echo '<!doctype html>'
  echo '<html lang="en"><head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<title>Bizzapps City · Interactive Portfolio</title>'
  echo "$FONTS"
  echo '<style>'; cat src/styles.css; echo '</style>'
  echo '</head><body>'
  cat src/body.html
  emit_scripts
  echo '</body></html>'
} > index.html

echo "Built:"
wc -c index.html artifact.html
