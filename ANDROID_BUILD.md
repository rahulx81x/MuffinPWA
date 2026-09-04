# Muffin Android APK Build Guide

This document describes how to build, sign, and test the standalone Android APK for Muffin using Capacitor.

---

## 1. Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **Java**: JDK 21 LTS (Gradle 8.x is configured in `android/gradle.properties` to target JDK 21)
- **Android SDK**: API Level 34+ installed (via Android Studio or command-line tools)
- **SDK Path**: Configured in `android/local.properties`:
  ```properties
  sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
  ```

---

## 2. Fast Build Commands

| Goal | Command |
|---|---|
| **Build Web + Sync Android** | `npm run build:mobile` |
| **Build Debug APK** | `npm run build:apk:debug` |
| **Open in Android Studio** | `npx cap open android` |
| **Extract SHA-1 / SHA-256** | `cd android && .\gradlew signingReport` |

---

## 3. Output Debug APK Location

After running `npm run build:apk:debug` (or `cd android && .\gradlew assembleDebug`):

```
android/app/build/outputs/apk/debug/app-debug.apk
```

You can install it directly onto any connected Android device or emulator with Developer Options / USB Debugging enabled:

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Google Cloud Console Credentials

### Signing Fingerprints (Debug)
- **SHA-1**: `5A:2E:47:6F:72:5D:B4:24:FF:C0:B6:6E:5D:A2:8F:21:9E:B9:C6:46`
- **SHA-256**: `D7:90:DA:5C:B7:AF:50:A9:02:5F:E1:21:FB:E2:54:97:6C:08:3B:71:21:2D:07:96:0D:60:44:E0:86:F0:E6:BE`
- **Package Name**: `com.rahulgouri.muffin`

If you register an Android OAuth Client in Google Cloud Console:
1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Select **Android**.
4. Package name: `com.rahulgouri.muffin`.
5. SHA-1 certificate fingerprint: Paste the SHA-1 above.

---

## 5. Generating a Signed Release APK

### Step 1: Create a Release Keystore (Run Once)
```powershell
keytool -genkey -v -keystore muffin-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias muffin
```
Store `muffin-release-key.jks` in a secure location outside public version control.

### Step 2: Configure Signing in `android/app/build.gradle`
Add signing configuration under `android { ... }`:
```groovy
signingConfigs {
    release {
        storeFile file("muffin-release-key.jks") // or absolute path
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias "muffin"
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Step 3: Assemble Release APK
```powershell
npm run build:mobile
cd android
.\gradlew assembleRelease
```

The output signed release APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```
