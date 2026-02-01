import { useState, useEffect } from "react";
import { HardDrive, Folder } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Capacitor } from "@capacitor/core";
import { deviceService, StorageInfo } from "@/services/deviceService";
import { cn } from "@/lib/utils";

export function StorageMonitor() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    total: 0,
    used: 0,
    available: 0,
    percentageUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const isNativePlatform = Capacitor.isNativePlatform();
        setIsNative(isNativePlatform);

        // Get storage info from deviceService (handles native vs web automatically)
        const info = await deviceService.getStorageInfo();
        setStorageInfo(info);

        // Check for storage alerts
        if (info.percentageUsed >= 80) {
          await deviceService.sendStorageNotification(info.percentageUsed);
        }
      } catch (error) {
        console.error("Failed to get storage info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageInfo();
    
    // Update every 60 seconds
    const interval = setInterval(fetchStorageInfo, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getStorageColor = (percentage: number) => {
    if (percentage >= 90) return "danger";
    if (percentage >= 80) return "warning";
    return "tech-blue";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const storageColor = getStorageColor(storageInfo.percentageUsed);

  return (
    <div className="space-y-6">
      {/* Main Storage Status */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <HardDrive className={cn("h-6 w-6",
              storageColor === "danger" && "text-danger",
              storageColor === "warning" && "text-warning",
              storageColor === "tech-blue" && "text-tech-blue"
            )} />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={`hsl(var(--${storageColor}))`}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(storageInfo.percentageUsed / 100) * 314} 314`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{storageInfo.percentageUsed}%</div>
                  <div className="text-xs text-muted-foreground">Used</div>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className={cn("font-medium",
                storageColor === "danger" && "text-danger",
                storageColor === "warning" && "text-warning",
                storageColor === "tech-blue" && "text-tech-blue"
              )}>
                {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.total)}
              </span>
            </div>
            <Progress 
              value={storageInfo.percentageUsed} 
              className="h-3"
            />
          </div>

          {/* Storage Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {formatBytes(storageInfo.used)}
              </div>
              <div className="text-xs text-muted-foreground">Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-tech-green">
                {formatBytes(storageInfo.available)}
              </div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-tech-blue">
                {formatBytes(storageInfo.total)}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Categories */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Folder className="h-5 w-5" />
            Storage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isNative ? (
              // Native: Show real data as "System & Apps" to match total
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">System & Apps</span>
                  <span className="text-muted-foreground">{formatBytes(storageInfo.used)}</span>
                </div>
                <Progress 
                  value={storageInfo.percentageUsed} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Detailed breakdown requires additional permissions
                </p>
              </div>
            ) : (
              // Web: Show mock breakdown categories
              [
                { name: "Apps", size: storageInfo.used * 0.4, color: "tech-blue" },
                { name: "Photos", size: storageInfo.used * 0.25, color: "tech-purple" },
                { name: "Videos", size: storageInfo.used * 0.2, color: "warning" },
                { name: "Documents", size: storageInfo.used * 0.1, color: "tech-green" },
                { name: "Other", size: storageInfo.used * 0.05, color: "muted" },
              ].map((category) => (
                <div key={category.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{category.name}</span>
                    <span className="text-muted-foreground">{formatBytes(category.size)}</span>
                  </div>
                  <Progress 
                    value={(category.size / storageInfo.total) * 100} 
                    className="h-2"
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>


      {/* Alert Settings */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Alert Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Storage Alerts</span>
              <span className="text-warning">80%, 85%, 90%, 95%, 100%</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              Get notified when storage usage reaches these levels
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}