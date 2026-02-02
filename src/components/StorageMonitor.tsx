import { HardDrive, Folder, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { useStorage } from "@/contexts/StorageContext";
import { cn } from "@/lib/utils";

export function StorageMonitor() {
  const { storageData, isScanning, hasPermission, scanStorage } = useStorage();
  const isNative = Capacitor.isNativePlatform();

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

  // Loading state
  if (isScanning || !storageData) {
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

  // Permission required state (for native only)
  if (isNative && !hasPermission) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-card border-border/50 shadow-elevated">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto p-4 bg-warning/10 rounded-full w-fit">
                <AlertTriangle className="h-12 w-12 text-warning" />
              </div>
              <h3 className="text-xl font-semibold">Permission Required</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Storage analysis requires file access permission. Please grant permission to view your storage breakdown.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const storageColor = getStorageColor(storageData.percentageUsed);
  const { breakdown } = storageData;

  // Calculate breakdown for display
  const breakdownCategories = [
    { name: "Images", size: breakdown.images, color: "tech-blue" },
    { name: "Videos", size: breakdown.videos, color: "tech-purple" },
    { name: "Audio", size: breakdown.audio, color: "warning" },
    { name: "Documents", size: breakdown.documents, color: "tech-green" },
    { name: "Apps & System", size: breakdown.appsAndSystem, color: "muted-foreground" },
  ].filter(cat => cat.size > 0); // Only show categories with data

  return (
    <div className="space-y-6">
      {/* Main Storage Status */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <HardDrive className={cn("h-6 w-6",
                storageColor === "danger" && "text-danger",
                storageColor === "warning" && "text-warning",
                storageColor === "tech-blue" && "text-tech-blue"
              )} />
              Storage Usage
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={scanStorage}
              disabled={isScanning}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
            </Button>
          </div>
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
                  strokeDasharray={`${(storageData.percentageUsed / 100) * 314} 314`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{storageData.percentageUsed}%</div>
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
                {formatBytes(storageData.used)} of {formatBytes(storageData.total)}
              </span>
            </div>
            <Progress 
              value={storageData.percentageUsed} 
              className="h-3"
            />
          </div>

          {/* Storage Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {formatBytes(storageData.used)}
              </div>
              <div className="text-xs text-muted-foreground">Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-tech-green">
                {formatBytes(storageData.available)}
              </div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-tech-blue">
                {formatBytes(storageData.total)}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Breakdown */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Folder className="h-5 w-5" />
            Storage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {breakdownCategories.length > 0 ? (
              breakdownCategories.map((category) => (
                <div key={category.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{category.name}</span>
                    <span className="text-muted-foreground">{formatBytes(category.size)}</span>
                  </div>
                  <Progress 
                    value={storageData.total > 0 ? (category.size / storageData.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No categorized data found.</p>
                <p className="text-sm mt-1">Storage is being used by system and apps.</p>
              </div>
            )}
          </div>
          
          {isNative && (
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
              Categories based on scanning DCIM, Pictures, Downloads, Music, Movies, and Documents folders.
            </p>
          )}
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
