#!/bin/bash
# Build Hybrid APK (loads from website - auto-updates)

echo "🌐 Building HYBRID APK (auto-updates from web)..."
echo ""

# Use hybrid config
cp capacitor.config.hybrid.json capacitor.config.json

# Sync (minimal - just config needed)
npx cap sync

# Build APK
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
./gradlew clean assembleDebug --no-daemon

# Copy result
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk apotek-alpro-hybrid.apk

echo ""
echo "✅ HYBRID APK ready: apotek-alpro-hybrid.apk"
echo "📱 This APK will auto-update from: https://apotekalpro.github.io/apotek-alpro-dashboard"
echo ""
echo "⚠️  IMPORTANT: Make sure your website is deployed and accessible!"
echo "   Test URL: https://apotekalpro.github.io/apotek-alpro-dashboard"
