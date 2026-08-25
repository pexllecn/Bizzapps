#!/usr/bin/env bash
# Regenerate src/ms-icons.js by inlining the SVGs in /icons as data URIs.
# Edit the MAP below (logo id | filename) to add or replace icons, then run:
#   ./tools/build-icons.sh && ./build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

MAP="
dataverse|Dataverse_scalable.svg
powerapps|PowerApps_scalable.svg
powerautomate|PowerAutomate_scalable.svg
powerpages|PowerPages_scalable.svg
dynamics|Dynamics365_scalable.svg
copilot|microsoft-copilot.svg
"

{
  echo '/* ============================================================================'
  echo ' *  REAL PRODUCT ICONS  (official Microsoft SVGs, inlined as data URIs)'
  echo ' *  Source files live in /icons. Regenerate with tools/build-icons.sh after'
  echo ' *  adding or replacing an icon there. Any id present here renders the real'
  echo ' *  icon; any id missing falls back to the built-in drawn mark in ms-iso.js.'
  echo ' * ========================================================================== */'
  echo 'window.ICONS = {'
  echo "$MAP" | while IFS='|' read -r id file; do
    [ -z "${id:-}" ] && continue
    [ -f "icons/$file" ] || { echo "  // $id: missing icons/$file" >&2; continue; }
    b64=$(base64 -w0 "icons/$file")
    echo "  $id: \"data:image/svg+xml;base64,$b64\","
  done
  echo '};'
} > src/ms-icons.js

echo "Wrote src/ms-icons.js ($(wc -c < src/ms-icons.js) bytes)"
