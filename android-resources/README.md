# Smart Saver Android Resources

This folder contains the Android-specific resources for the Smart Saver app.

## Setup Instructions

After running `npx cap add android`, you'll need to copy these files to the appropriate locations in your `android/` folder:

### 1. Icon Resources
- Copy `public/logo.png` to multiple mipmap folders with different sizes:
  - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
  - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
  - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
  - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
  - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

### 2. Splash Screen Resources
- Copy `public/logo.png` as `android/app/src/main/res/drawable/splash_logo.png`
- Copy `android-resources/drawable/splash.xml` to `android/app/src/main/res/drawable/`

### 3. Style and Color Resources
- Copy `android-resources/values/styles.xml` to `android/app/src/main/res/values/`
- Copy `android-resources/values/colors.xml` to `android/app/src/main/res/values/`
- Copy `android-resources/values-night/styles.xml` to `android/app/src/main/res/values-night/`

### 4. AndroidManifest.xml
Update your `android/app/src/main/AndroidManifest.xml` using the entries from `AndroidManifest-additions.xml`

## Commands to Run

1. `npx cap add android`
2. Copy the resources as described above
3. `npx cap sync android`
4. `npx cap run android`

## Icon Sizes
Use the following sizes for your logo:
- **mdpi**: 48x48 px
- **hdpi**: 72x72 px
- **xhdpi**: 96x96 px
- **xxhdpi**: 144x144 px
- **xxxhdpi**: 192x192 px

## Adaptive Icons (Android 8.0+)
For modern Android versions, you can also create adaptive icons by adding:
- `ic_launcher_foreground.xml` (your logo)
- `ic_launcher_background.xml` (solid color background)