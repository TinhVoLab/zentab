#!/bin/sh
# Builds the Chrome Web Store upload: dist/zentab-<version>.zip
# Only files the extension loads go in; the master icon, privacy policy (hosted separately)
# and dev files stay out.
set -e
cd "$(dirname "$0")/.."

version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
out="dist/zentab-$version.zip"

files="manifest.json index.html style.css liquid-glass.css theme.js ambient.js script.js relax.js journal.js quotes.js donate.js greet.js qrcode.js iztro.min.js background.jpg wallpapers/moon.svg wallpapers/mist.svg sounds/zentab-music.m4a icons/icon16.png icons/icon48.png icons/icon128.png"

# Every local file index.html / manifest.json references must be in the list
for f in $files; do [ -f "$f" ] || { echo "Missing: $f" >&2; exit 1; }; done
for ref in $(grep -ohE '(src|href)="[^"#:]+"' index.html | sed 's/.*="\(.*\)"/\1/'); do
  echo " $files " | grep -q " $ref " || { echo "index.html references $ref but it isn't packaged" >&2; exit 1; }
done

if grep -q 'EMAIL_LIEN_HE' privacy_policy.html; then
  echo "Warning: privacy_policy.html still has the EMAIL_LIEN_HE placeholder" >&2
fi

mkdir -p dist
rm -f "$out"
zip -q -X "$out" $files
echo "$out ($(du -h "$out" | cut -f1 | tr -d ' '))"
