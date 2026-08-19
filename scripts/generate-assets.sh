#!/usr/bin/env bash
# Regenerates the Android launcher icon from the app's own PWA icons.
#
# There is no separate artwork for the APK on purpose: the home screen icon
# should be the same spool end-on you get when you install this from Chrome. So
# the sources are icon-512.png and icon-512-maskable.png in the repo root, which
# are also what manifest.webmanifest points at.
#
# Only needed when those change — the generated files are committed, so a normal
# build or install does not run this.
#
# Usage:
#   npm run assets

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The icon's own background, so the adaptive layers meet without a seam.
BACKGROUND="#1B1F26"

# ——— Sources for @capacitor/assets ———
#
# It wants these exact filenames in assets/ at 1024px. Deliberately no
# splash.png alongside them: without one it generates no native splash, and the
# app opens straight into itself.
#
# The maskable icon becomes the foreground because it is the one already drawn
# with a safe zone — the spool sits well inside the circle a launcher mask will
# crop to.

echo "→ scaling the source icons to 1024px"
mkdir -p assets
sips -z 1024 1024 icon-512.png --out assets/icon-only.png >/dev/null
sips -z 1024 1024 icon-512-maskable.png --out assets/icon-foreground.png >/dev/null

echo "→ generating Android icons"
npx capacitor-assets generate --android

# ——— Fixing up what capacitor-assets writes ———
#
# Two things are wrong out of the box:
#
#   1. It points the background at @mipmap/ic_launcher_background, which it
#      never writes to mipmap — the color lands in drawable/ and values/
#      instead. Left alone the build fails on the missing resource.
#   2. It insets both layers by 16.7% so square artwork fills the guaranteed-
#      visible circle. Our foreground *is* the maskable icon, already drawn with
#      that margin, so the inset applies it twice and the spool ends up a small
#      disc adrift in a dark square.
#
# Full bleed over a flat color fixes both.

echo "→ rewriting the adaptive icon to full bleed"
for f in android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
  android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml; do
  cat > "$f" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<!-- Full bleed on purpose. @capacitor/assets insets the foreground by 16.7% to
     fit square art inside the 72dp guaranteed-visible circle, but the source
     here is icon-512-maskable.png, which already carries that margin — insetting
     it again shrinks the spool to a dot. The background is a flat color rather
     than the @mipmap drawable capacitor-assets names but never writes.
     Rewritten by scripts/generate-assets.sh after every regeneration. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
XML
done

cat > android/app/src/main/res/values/ic_launcher_background.xml <<XML
<?xml version="1.0" encoding="utf-8"?>
<!-- The icon artwork's own background. Rewritten by scripts/generate-assets.sh. -->
<resources>
    <color name="ic_launcher_background">$BACKGROUND</color>
</resources>
XML

printf '\nIcons regenerated. Reinstall to see them: npm run android:install\n'