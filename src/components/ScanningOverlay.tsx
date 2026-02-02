import { Loader2, HardDrive } from "lucide-react";
import { useStorage } from "@/contexts/StorageContext";

export function ScanningOverlay() {
  const { isScanning, hasPermission } = useStorage();

  // Only show when scanning after permission granted
  if (!isScanning || !hasPermission) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative mx-auto w-24 h-24">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <HardDrive className="h-10 w-10 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Analyzing Storage</h2>
          <p className="text-muted-foreground">
            Scanning your files and folders...
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>This may take a moment</span>
        </div>
      </div>
    </div>
  );
}
