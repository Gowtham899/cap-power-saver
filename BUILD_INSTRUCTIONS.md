# Android Build Instructions for Smart Saver

## Why the errors happened:
1. **Missing dist directory**: You need to build the web app first before syncing to Android
2. **Missing config files in android/app**: These are auto-generated during `npx cap sync` when dist exists
3. **Server URL in config**: Development configs had remote URL, production builds need local assets

## Complete build process:

### 1. Initial setup (one-time):
```bash
# Clone your repo and install dependencies
git clone <your-repo>
cd <your-project>
npm install

# Add Android platform (if not already added)
npx cap add android
```

### 2. Build for Android (every time you make changes):
```bash
# Step 1: Build the web app (creates dist folder)
npm run build

# Step 2: Sync web assets to Android
npx cap sync android

# Step 3: Open in Android Studio
npx cap open android
```

### 3. Build release APK/AAB in Android Studio:
- Build > Generate Signed Bundle/APK
- Follow the signing wizard

## Development vs Production:

### For development with hot reload:
Use `capacitor.config.json` with server.url pointing to Lovable preview:
```json
{
  "server": {
    "url": "https://8d915f61-7b05-4570-b15d-b3fd54ebbfaa.lovableproject.com?forceHideBadge=true",
    "cleartext": true
  }
}
```

### For production/Play Store:
Use `capacitor.config.ts` (this file) WITHOUT server.url - it will use local dist assets.

## Common issues:

**"dist directory not found"**
→ Run `npm run build` first

**"Cannot copy web assets"**
→ Make sure dist folder exists and webDir in capacitor.config.ts is "dist"

**"ENOENT capacitor.config.json"**
→ This file is auto-generated in android/app during sync, ignore this warning

**App shows blank screen**
→ Check Android logcat for errors, ensure all Capacitor plugins are installed

## Quick checklist before Play Store:
- [ ] Run `npm run build`
- [ ] Run `npx cap sync android`
- [ ] Test on physical device
- [ ] Remove any development URLs from config
- [ ] Generate signed release bundle
- [ ] Test release build thoroughly
