package com.gowtham.smartsaver;

import android.os.Environment;
import android.os.StatFs;
import android.webkit.JavascriptInterface;

/**
 * Native Android bridge to expose real storage information to the WebView.
 * 
 * Usage in MainActivity.onCreate():
 *   webView.addJavascriptInterface(new StorageBridge(), "NativeStorage");
 * 
 * The JavaScript can then access:
 *   window.NativeStorage.totalBytes
 *   window.NativeStorage.freeBytes
 *   window.NativeStorage.usedBytes
 */
public class StorageBridge {
    
    @JavascriptInterface
    public long getTotalBytes() {
        try {
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            return stat.getBlockSizeLong() * stat.getBlockCountLong();
        } catch (Exception e) {
            return 0;
        }
    }
    
    @JavascriptInterface
    public long getFreeBytes() {
        try {
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            return stat.getBlockSizeLong() * stat.getAvailableBlocksLong();
        } catch (Exception e) {
            return 0;
        }
    }
    
    @JavascriptInterface
    public long getUsedBytes() {
        return getTotalBytes() - getFreeBytes();
    }
    
    @JavascriptInterface
    public int getUsedPercentage() {
        long total = getTotalBytes();
        if (total == 0) return 0;
        return (int) Math.round((double) getUsedBytes() / total * 100);
    }
}
