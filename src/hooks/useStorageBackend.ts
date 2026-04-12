import { useState, useEffect, useCallback } from "react";
import { storageBackendService, StorageMetric, StorageAlert } from "@/services/storageBackendService";
import { deviceService, StorageInfo } from "@/services/deviceService";

export interface UseStorageBackendReturn {
  storageInfo: StorageInfo;
  loading: boolean;
  error: string | null;
  storageHistory: StorageMetric[];
  storageAlerts: StorageAlert[];
  trends: {
    averageUsage: number;
    peakUsage: number;
    usageGrowthRate: number;
    dataPoints: { date: string; percentage: number }[];
  };
  refreshStorage: () => Promise<void>;
  checkAndAlert: () => Promise<void>;
  clearError: () => void;
}

export function useStorageBackend(): UseStorageBackendReturn {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total: 0,
    used: 0,
    available: 0,
    percentageUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageHistory, setStorageHistory] = useState<StorageMetric[]>([]);
  const [storageAlerts, setStorageAlerts] = useState<StorageAlert[]>([]);
  const [trends, setTrends] = useState({
    averageUsage: 0,
    peakUsage: 0,
    usageGrowthRate: 0,
    dataPoints: [] as { date: string; percentage: number }[],
  });

  const refreshStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await storageBackendService.registerDevice();

      const info = await deviceService.getStorageInfo();
      setStorageInfo(info);

      await storageBackendService.recordStorageMetric(
        info.used,
        info.total,
        info.available
      );

      const [history, alerts, trendData] = await Promise.all([
        storageBackendService.getStorageHistory(7, 50),
        storageBackendService.getStorageAlerts(20),
        storageBackendService.getStorageTrends(30),
      ]);

      setStorageHistory(history);
      setStorageAlerts(alerts);
      setTrends(trendData);
    } catch (err) {
      console.error('Error refreshing storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh storage data');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAndAlert = useCallback(async () => {
    try {
      const info = await deviceService.getStorageInfo();
      const result = await storageBackendService.checkAndAlertStorage(
        info.used,
        info.total
      );

      if (result.alertTriggered && result.alert) {
        const alerts = await storageBackendService.getStorageAlerts(20);
        setStorageAlerts(alerts);

        if (result.thresholdReached) {
          await deviceService.sendStorageNotification(result.thresholdReached);
        }
      }
    } catch (err) {
      console.error('Error checking storage alerts:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    refreshStorage();

    const interval = setInterval(() => {
      refreshStorage();
      checkAndAlert();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshStorage, checkAndAlert]);

  return {
    storageInfo,
    loading,
    error,
    storageHistory,
    storageAlerts,
    trends,
    refreshStorage,
    checkAndAlert,
    clearError,
  };
}
