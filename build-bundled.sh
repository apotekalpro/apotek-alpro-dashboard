#!/bin/bash
# Build Bundled APK (offline - includes all files)

echo "📦 Building BUNDLED APK (offline version)..."
echo ""

# Use bundled config
cp capacitor.config.bundled.json capacitor.config.json

# Sync with all files
npm run sync

# Build APK
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
./gradlew clean assembleDebug --no-daemon

# Copy result
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk apotek-alpro-bundled.apk

echo ""
echo "✅ BUNDLED APK ready: apotek-alpro-bundled.apk"
echo "📱 This APK works offline with bundled files"
echo "⚠️  Needs manual rebuild after web updates"
