#!/usr/bin/env bash
# Même chose que sync_web.ps1, pour le Mac de compilation (Codemagic) : copie la version web
# (sans tests ni outils) dans assets/www, avant chaque build Flutter.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$here")"
dst="$here/assets/www"
rm -rf "$dst"; mkdir -p "$dst"
for f in "$root"/*; do
  [ -f "$f" ] || continue
  n="$(basename "$f")"
  case "$n" in test-*|package.json) continue ;; esac
  case "${n##*.}" in js|css|html|png|svg|webmanifest|mp3|opus|json|woff2) cp "$f" "$dst/" ;; esac
done
# dictionnaire anglais (la langue se choisit au premier lancement)
mkdir -p "$dst/i18n"; cp "$root/i18n/en.json" "$dst/i18n/"
# thème « futur » : robot et icônes 3D, décor
if [ -d "$root/theme/futur" ]; then mkdir -p "$dst/theme/futur"; cp -R "$root/theme/futur/." "$dst/theme/futur/"; fi
# voix enregistrées (femme F5) : manifeste + clips
if [ -f "$root/voice/manifest.json" ]; then
  mkdir -p "$dst/voice/clips/f5"; cp "$root"/voice/clips/f5/*.mp3 "$dst/voice/clips/f5/"
  cp "$root/voice/manifest.json" "$dst/voice/"
fi
echo "$(find "$dst" -type f | wc -l | tr -d ' ') fichiers copiés dans assets/www"
