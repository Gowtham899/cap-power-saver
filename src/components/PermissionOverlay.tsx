import { Shield, FolderOpen, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStorage } from "@/contexts/StorageContext";
import { useState } from "react";

export function PermissionOverlay() {
  const { hasPermission, permissionDenied, requestPermission, isScanning } = useStorage();
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show overlay if permission is granted or still checking
  if (hasPermission === true || hasPermission === null) {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Smart Saver</CardTitle>
          <CardDescription className="text-base">
            Let's set up your device monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features preview */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-tech-blue/10 rounded-lg shrink-0">
                <HardDrive className="h-5 w-5 text-tech-blue" />
              </div>
              <div>
                <h4 className="font-medium">Accurate Storage Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  See exactly how your storage is being used by photos, videos, apps, and more.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-tech-green/10 rounded-lg shrink-0">
                <FolderOpen className="h-5 w-5 text-tech-green" />
              </div>
              <div>
                <h4 className="font-medium">Smart Categorization</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically categorize files to help you identify what's taking up space.
                </p>
              </div>
            </div>
          </div>

          {/* Permission explanation */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              To analyze your storage usage, Smart Saver needs access to your files.
              {permissionDenied && (
                <span className="block mt-2 text-warning">
                  Permission was denied. Please grant access to continue.
                </span>
              )}
            </p>
          </div>

          {/* Action button */}
          <Button
            onClick={handleRequestPermission}
            className="w-full h-12 text-lg"
            disabled={isRequesting || isScanning}
          >
            {isRequesting || isScanning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isScanning ? "Analyzing Storage..." : "Requesting..."}
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Grant Permission
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your data stays on your device. We never upload or share your files.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
