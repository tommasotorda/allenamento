#!/bin/sh
# Uso: scripts/shoot-figures.sh <cartella-output>  -> pagine PNG da 10 figure ciascuna
OUT=${1:-/tmp}
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
IDS=$(node -e "console.log(require('./src/data/exercises.json').map(e=>e.id).join(' '))")
set -- $IDS
n=0
while [ $# -gt 0 ]; do
  chunk=""
  for i in 1 2 3 4 5 6 7 8; do [ $# -gt 0 ] && chunk="$chunk,$1" && shift; done
  npx tsx scripts/preview-figures.ts "${chunk#,}" "$OUT/p$n.html"
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1460,960 --screenshot="$OUT/p$n.png" "file://$OUT/p$n.html" 2>/dev/null
  n=$((n+1))
done
