import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface StorageBreakdown {
  images: number;
  videos: number;
  audio: number;
  documents: number;
  appsAndSystem: number;
}

export interface StorageData {
  total: number;
  used: number;
  available: number;
  percentageUsed: number;
  breakdown: StorageBreakdown;
}

interface StorageContextType {
  storageData: StorageData | null;
  isScanning: boolean;
  hasPermission: boolean | null;
  permissionDenied: boolean;
  scanStorage: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
}

const defaultStorageData: StorageData = {
  total: 0,
  used: 0,
  available: 0,
  percentageUsed: 0,
  breakdown: {
    images: 0,
    videos: 0,
    audio: 0,
    documents: 0,
    appsAndSystem: 0,
  },
};

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Check permission status
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      // Web always has "permission" (uses mock data)
      setHasPermission(true);
      return true;
    }

    try {
      // Try to read a directory to check if we have permission
      const result = await Filesystem.checkPermissions();
      const granted = result.publicStorage === 'granted';
      setHasPermission(granted);
      setPermissionDenied(!granted);
      return granted;
    } catch (error) {
      console.warn("Permission check failed:", error);
      setHasPermission(false);
      return false;
    }
  }, [isNative]);

  // Request filesystem permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setHasPermission(true);
      return true;
    }

    try {
      const result = await Filesystem.requestPermissions();
      const granted = result.publicStorage === 'granted';
      setHasPermission(granted);
      setPermissionDenied(!granted);
      return granted;
    } catch (error) {
      console.error("Permission request failed:", error);
      setHasPermission(false);
      setPermissionDenied(true);
      return false;
    }
  }, [isNative]);

  // Calculate folder size by reading all files recursively
  const getFolderSize = async (directory: Directory, path: string = ""): Promise<number> => {
    try {
      const result = await Filesystem.readdir({
        path,
        directory,
      });

      let totalSize = 0;

      for (const file of result.files) {
        if (file.type === "directory") {
          // Recursively get size of subdirectories
          const subPath = path ? `${path}/${file.name}` : file.name;
          totalSize += await getFolderSize(directory, subPath);
        } else {
          // Add file size
          totalSize += file.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      // Folder doesn't exist or can't be read - return 0
      console.warn(`Could not read folder ${path}:`, error);
      return 0;
    }
  };

  // Categorize files by extension
  const getFileSizesByCategory = async (directory: Directory, path: string = ""): Promise<{
    images: number;
    videos: number;
    audio: number;
    documents: number;
  }> => {
    const categories = { images: 0, videos: 0, audio: 0, documents: 0 };

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.3gp', '.flv'];
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
    const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.ppt', '.pptx'];

    try {
      const result = await Filesystem.readdir({
        path,
        directory,
      });

      for (const file of result.files) {
        if (file.type === "directory") {
          const subPath = path ? `${path}/${file.name}` : file.name;
          const subCategories = await getFileSizesByCategory(directory, subPath);
          categories.images += subCategories.images;
          categories.videos += subCategories.videos;
          categories.audio += subCategories.audio;
          categories.documents += subCategories.documents;
        } else {
          const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
          const size = file.size || 0;

          if (imageExtensions.includes(ext)) {
            categories.images += size;
          } else if (videoExtensions.includes(ext)) {
            categories.videos += size;
          } else if (audioExtensions.includes(ext)) {
            categories.audio += size;
          } else if (docExtensions.includes(ext)) {
            categories.documents += size;
          }
        }
      }
    } catch (error) {
      console.warn(`Could not categorize files in ${path}:`, error);
    }

    return categories;
  };

  // Main scan function
  const scanStorage = useCallback(async () => {
    setIsScanning(true);

    try {
      if (!isNative) {
        // Web: Use mock data (no random values)
        const mockTotal = 128 * 1024 * 1024 * 1024; // 128GB
        const mockUsed = 64 * 1024 * 1024 * 1024; // 64GB fixed
        
        setStorageData({
          total: mockTotal,
          used: mockUsed,
          available: mockTotal - mockUsed,
          percentageUsed: 50,
          breakdown: {
            images: mockUsed * 0.25,
            videos: mockUsed * 0.35,
            audio: mockUsed * 0.1,
            documents: mockUsed * 0.05,
            appsAndSystem: mockUsed * 0.25,
          },
        });
        setIsScanning(false);
        return;
      }

      // Native: Get real device info
      // First try native bridge, then Device.getInfo()
      let total = 0;
      let available = 0;
      
      // Check for native storage bridge (Android)
      if ((window as any).NativeStorage) {
        const nativeStorage = (window as any).NativeStorage;
        total = nativeStorage.totalBytes || 0;
        available = nativeStorage.freeBytes || 0;
      } else {
        // Fallback to Device.getInfo() - note: these may not be available on all devices
        const deviceInfo = await Device.getInfo();
        // Cast to any since these properties exist on Android but not in TS types
        const info = deviceInfo as any;
        total = info.realDiskTotal || info.diskTotal || 0;
        available = info.realDiskFree || info.diskFree || 0;
      }
      
      const used = total - available;

      // Try to scan common directories for breakdown
      let breakdown: StorageBreakdown = {
        images: 0,
        videos: 0,
        audio: 0,
        documents: 0,
        appsAndSystem: 0,
      };

      // Scan external storage directories if permission granted
      if (hasPermission) {
        try {
          // Scan DCIM (camera photos/videos)
          const dcimCategories = await getFileSizesByCategory(Directory.External, "DCIM");
          breakdown.images += dcimCategories.images;
          breakdown.videos += dcimCategories.videos;

          // Scan Pictures folder
          const picturesCategories = await getFileSizesByCategory(Directory.External, "Pictures");
          breakdown.images += picturesCategories.images;
          breakdown.videos += picturesCategories.videos;

          // Scan Download folder
          const downloadCategories = await getFileSizesByCategory(Directory.External, "Download");
          breakdown.images += downloadCategories.images;
          breakdown.videos += downloadCategories.videos;
          breakdown.audio += downloadCategories.audio;
          breakdown.documents += downloadCategories.documents;

          // Scan Music folder
          const musicCategories = await getFileSizesByCategory(Directory.External, "Music");
          breakdown.audio += musicCategories.audio;

          // Scan Documents folder
          const docsCategories = await getFileSizesByCategory(Directory.External, "Documents");
          breakdown.documents += docsCategories.documents;

          // Scan Movies folder
          const moviesCategories = await getFileSizesByCategory(Directory.External, "Movies");
          breakdown.videos += moviesCategories.videos;

        } catch (error) {
          console.warn("Failed to scan directories:", error);
        }
      }

      // Calculate Apps & System (everything not categorized)
      const categorizedTotal = breakdown.images + breakdown.videos + breakdown.audio + breakdown.documents;
      breakdown.appsAndSystem = Math.max(0, used - categorizedTotal);

      setStorageData({
        total,
        used,
        available,
        percentageUsed: total > 0 ? Math.round((used / total) * 100) : 0,
        breakdown,
      });

    } catch (error) {
      console.error("Storage scan failed:", error);
      // Don't set mock data on native - show permission required
      if (!isNative) {
        const mockTotal = 128 * 1024 * 1024 * 1024;
        const mockUsed = 64 * 1024 * 1024 * 1024;
        setStorageData({
          total: mockTotal,
          used: mockUsed,
          available: mockTotal - mockUsed,
          percentageUsed: 50,
          breakdown: {
            images: mockUsed * 0.25,
            videos: mockUsed * 0.35,
            audio: mockUsed * 0.1,
            documents: mockUsed * 0.05,
            appsAndSystem: mockUsed * 0.25,
          },
        });
      }
    } finally {
      setIsScanning(false);
    }
  }, [isNative, hasPermission]);

  // Auto-check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Auto-scan when permission is granted
  useEffect(() => {
    if (hasPermission && !storageData && !isScanning) {
      scanStorage();
    }
  }, [hasPermission, storageData, isScanning, scanStorage]);

  return (
    <StorageContext.Provider
      value={{
        storageData,
        isScanning,
        hasPermission,
        permissionDenied,
        scanStorage,
        requestPermission,
        checkPermission,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
}
