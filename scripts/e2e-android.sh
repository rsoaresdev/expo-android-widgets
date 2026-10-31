#!/usr/bin/env bash
# Packs this package, installs it in a new Expo app with the example widget,
# runs prebuild twice and builds a debug APK. Proves the plugin output and the
# Kotlin compile against the Expo SDK the template uses.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

npm pack --pack-destination "$work" --prefix "$root" >/dev/null
tarball="$(ls "$work"/expo-android-widgets-*.tgz)"

cd "$work"
npx --yes create-expo-app@latest app --template blank-typescript --no-install
cd app
npm install
npm install "$tarball"
mkdir -p widgets
cp -R node_modules/expo-android-widgets/example/widgets/android widgets/android

node -e '
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("app.json", "utf8"));
config.expo.android = { ...config.expo.android, package: "com.example.widgetse2e" };
config.expo.plugins = [
  ...(config.expo.plugins ?? []),
  ["expo-android-widgets", {
    src: "./widgets/android",
    widgets: [{ name: "SummaryWidget", info: "widget_summary_info", label: "@string/widget_summary_label" }],
  }],
];
fs.writeFileSync("app.json", JSON.stringify(config, null, 2));
'

CI=1 npx expo prebuild --platform android --no-install
CI=1 npx expo prebuild --platform android --no-install

receivers="$(grep -c 'android:name=".widgets.SummaryWidget"' android/app/src/main/AndroidManifest.xml)"
if [ "$receivers" != "1" ]; then
  echo "Expected one SummaryWidget receiver after two prebuilds, found $receivers" >&2
  exit 1
fi
grep -q "package com.example.widgetse2e.widgets" \
  android/app/src/main/java/com/example/widgetse2e/widgets/SummaryWidget.kt

cd android
./gradlew assembleDebug --console=plain
test -f app/build/outputs/apk/debug/app-debug.apk
echo "e2e: the example widget builds"
