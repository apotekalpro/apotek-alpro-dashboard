# Apotek Alpro - Mobile Application Documentation

## 📱 Mobile App Overview

This document describes the mobile-responsive version and native Android APK of the Apotek Alpro Executive Dashboard.

### What Was Done

1. **Mobile-Responsive Design** ✅
   - Added comprehensive mobile-first CSS (`mobile-styles.css`)
   - Optimized layouts for phones, tablets, and desktops
   - Touch-friendly buttons and controls
   - Safe area support for notched devices (iOS)
   - Landscape orientation support
   - Better scrolling performance

2. **Native Android APK** ✅
   - Built using Capacitor.js framework
   - Wraps web app into native Android application
   - Full access to device features
   - 4.1 MB APK size
   - Minimum Android version: 6.0 (API 23)
   - Target Android version: 14 (API 35)

## 📦 APK Installation

### File Information
- **File Name**: `apotek-alpro-mobile-v1.0.apk`
- **Size**: 4.1 MB
- **Package ID**: `com.apotekalpro.dashboard`
- **Version**: 1.0.0
- **Build Type**: Debug (for testing)

### Installation Steps

#### For Android Devices:

1. **Enable Unknown Sources**
   - Go to Settings → Security
   - Enable "Install from Unknown Sources" or "Install Unknown Apps"
   - For Android 8.0+, you'll be prompted when installing

2. **Transfer APK to Device**
   - Copy `apotek-alpro-mobile-v1.0.apk` to your Android device
   - You can use:
     - USB cable
     - Email attachment
     - Cloud storage (Google Drive, Dropbox)
     - Direct download

3. **Install the APK**
   - Open file manager on Android device
   - Navigate to the APK file location
   - Tap on the APK file
   - Tap "Install"
   - Wait for installation to complete
   - Tap "Open" to launch the app

### Security Notice

This is a DEBUG build for testing purposes. For production use, you should:
- Build a RELEASE version
- Sign the APK with a proper keystore
- Optionally publish to Google Play Store

## 🎨 Mobile Features

### Responsive Breakpoints

- **Extra Small** (< 576px): Phones in portrait
- **Small** (576px - 767px): Phones in landscape, small tablets
- **Medium** (768px - 991px): Tablets
- **Large** (> 992px): Desktops

### Mobile-Specific Improvements

1. **Layout Adaptations**
   - Stacked navigation on mobile
   - Full-width buttons and cards
   - Optimized font sizes
   - Collapsible headers

2. **Touch Optimizations**
   - Minimum 44x44px touch targets
   - Active state feedback
   - Smooth scrolling
   - Disabled hover effects on touch devices

3. **Performance**
   - Hardware-accelerated scrolling
   - Optimized animations
   - Reduced transform effects on mobile

4. **Device Support**
   - iPhone notch support (safe-area-inset)
   - Android system bars
   - Prevents zoom on input focus (iOS)
   - Proper viewport configuration

## 🛠️ Building from Source

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Java JDK 21
- Android SDK (API 35)
- Gradle 8.11+

### Build Commands

```bash
# Install dependencies
npm install

# Sync web files to www directory
npm run build

# Sync Capacitor project
npm run sync

# Build debug APK
npm run build:apk

# Build release APK (requires signing)
npm run build:apk-release
```

### Manual Build

```bash
# Navigate to android directory
cd android

# Clean previous builds
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Find APK at:
# android/app/build/outputs/apk/debug/app-debug.apk
# android/app/build/outputs/apk/release/app-release.apk
```

## 📝 Configuration Files

### Important Files

1. **capacitor.config.json**
   - App ID, name, and basic configuration
   - Web directory path
   - Server configuration

2. **package.json**
   - Build scripts
   - Dependencies
   - Project metadata

3. **mobile-styles.css**
   - Mobile-responsive styles
   - Media queries
   - Touch optimizations

4. **android/local.properties**
   - Android SDK path
   - Local build configuration

5. **android/app/build.gradle**
   - Android build configuration
   - Dependencies
   - Signing configuration

## 🔧 Customization

### Changing App Name

Edit `capacitor.config.json`:
```json
{
  "appName": "Your App Name"
}
```

### Changing Package ID

Edit `capacitor.config.json`:
```json
{
  "appId": "com.yourcompany.yourapp"
}
```

Then sync and rebuild:
```bash
npm run sync
npm run build:apk
```

### Adding App Icons

1. Place icons in `android/app/src/main/res/` directories:
   - `mipmap-hdpi/` (72x72)
   - `mipmap-mdpi/` (48x48)
   - `mipmap-xhdpi/` (96x96)
   - `mipmap-xxhdpi/` (144x144)
   - `mipmap-xxxhdpi/` (192x192)

2. Or use Capacitor's icon generator:
   ```bash
   npm install @capacitor/assets
   npx capacitor-assets generate
   ```

### Splash Screen

Configure in `android/app/src/main/res/values/styles.xml`

## 🚀 Distribution Options

### 1. Direct Distribution (Current)
- Share APK file directly
- Users install via file manager
- No Google Play account needed
- Good for internal testing

### 2. Google Play Store
- Requires Google Play Developer account ($25 one-time fee)
- Must build RELEASE APK with proper signing
- Reaches wider audience
- Automatic updates

### 3. Enterprise Distribution
- Internal company app store
- Mobile Device Management (MDM)
- Controlled distribution

## 🐛 Troubleshooting

### Installation Issues

**"App not installed"**
- Ensure unknown sources is enabled
- Check available storage space
- Try uninstalling old version first

**"Parse error"**
- APK file may be corrupted
- Re-download the APK
- Ensure Android version is 6.0 or higher

### Runtime Issues

**App crashes on startup**
- Check internet connectivity
- Verify Supabase configuration
- Check device logs via `adb logcat`

**Login not working**
- Ensure device has internet connection
- Verify Supabase URLs are accessible
- Check date/time settings on device

### Build Issues

**Java version errors**
- Ensure Java 21 is installed
- Set JAVA_HOME environment variable
- Use `java -version` to verify

**Gradle build fails**
- Clean project: `./gradlew clean`
- Check Android SDK installation
- Verify `local.properties` has correct SDK path

## 📊 Technical Stack

- **Framework**: Capacitor 7.4.4
- **Web Stack**: HTML5, CSS3, JavaScript
- **UI Framework**: Tailwind CSS 2.2.19
- **Backend**: Supabase
- **Build System**: Gradle 8.11.1
- **Java Version**: 21 (Amazon Corretto)
- **Min Android API**: 23 (Android 6.0)
- **Target Android API**: 35 (Android 14)

## 📄 License

ISC License - See package.json for details

## 👥 Support

For issues or questions, contact the development team.

---

**Last Updated**: October 23, 2025
**Version**: 1.0.0
**Build Date**: 2025-10-23
