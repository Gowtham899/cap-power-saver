import { useState } from "react";
import { useOnboarding, OnboardingStep } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  FolderOpen, 
  Bell, 
  Cpu, 
  ChevronRight, 
  Check, 
  X, 
  Loader2,
  Sparkles,
  BatteryMedium,
  HardDrive,
  Wifi
} from "lucide-react";

const steps: OnboardingStep[] = ["welcome", "storage", "notifications", "background"];

export function OnboardingWizard() {
  const {
    currentStep,
    permissionStatus,
    setCurrentStep,
    requestStoragePermission,
    requestNotificationPermission,
    acknowledgeBackgroundMode,
    skipPermission,
    completeOnboarding,
  } = useOnboarding();

  const [isRequesting, setIsRequesting] = useState(false);

  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const goToNextStep = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleStoragePermission = async () => {
    setIsRequesting(true);
    try {
      await requestStoragePermission();
    } finally {
      setIsRequesting(false);
      goToNextStep();
    }
  };

  const handleNotificationPermission = async () => {
    setIsRequesting(true);
    try {
      await requestNotificationPermission();
    } finally {
      setIsRequesting(false);
      goToNextStep();
    }
  };

  const handleBackgroundMode = () => {
    acknowledgeBackgroundMode();
    completeOnboarding();
  };

  const handleSkip = (permission: "storage" | "notifications" | "background") => {
    skipPermission(permission);
    if (permission === "background") {
      completeOnboarding();
    } else {
      goToNextStep();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "granted":
        return <Check className="h-4 w-4 text-tech-green" />;
      case "denied":
      case "skipped":
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <Progress value={progress} className="h-1" />
      </div>

      <Card className="w-full max-w-md bg-gradient-card border-border/50 shadow-elevated">
        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 relative">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 bg-tech-green/20 rounded-full">
                  <BatteryMedium className="h-5 w-5 text-tech-green" />
                </div>
              </div>
              <CardTitle className="text-2xl">Welcome to Smart Saver</CardTitle>
              <CardDescription className="text-base">
                Your intelligent device health companion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-tech-blue/10 rounded-lg shrink-0">
                    <BatteryMedium className="h-5 w-5 text-tech-blue" />
                  </div>
                  <div>
                    <h4 className="font-medium">Battery Monitoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Track battery health, temperature, and optimize charging habits
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-tech-green/10 rounded-lg shrink-0">
                    <HardDrive className="h-5 w-5 text-tech-green" />
                  </div>
                  <div>
                    <h4 className="font-medium">Storage Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Understand what's taking up space and clean up efficiently
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-tech-purple/10 rounded-lg shrink-0">
                    <Wifi className="h-5 w-5 text-tech-purple" />
                  </div>
                  <div>
                    <h4 className="font-medium">Data Usage Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor mobile and WiFi usage to avoid overages
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep("storage")}
                className="w-full h-12 text-lg"
              >
                Get Started
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Storage Permission Step */}
        {currentStep === "storage" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-tech-blue/10 rounded-full relative">
                <FolderOpen className="h-12 w-12 text-tech-blue" />
                {getStatusIcon(permissionStatus.storage)}
              </div>
              <CardTitle className="text-xl">Storage Access</CardTitle>
              <CardDescription className="text-base">
                Required to analyze your storage usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                <p className="text-sm">Smart Saver needs storage access to:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Analyze which files are taking up space</li>
                  <li>• Categorize photos, videos, and documents</li>
                  <li>• Show accurate storage breakdown</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleStoragePermission}
                  className="w-full h-12"
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 mr-2" />
                      Grant Storage Permission
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSkip("storage")}
                  className="w-full"
                  disabled={isRequesting}
                >
                  Skip for now
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Your data stays on your device. We never upload your files.
              </p>
            </CardContent>
          </>
        )}

        {/* Notification Permission Step */}
        {currentStep === "notifications" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-tech-yellow/10 rounded-full relative">
                <Bell className="h-12 w-12 text-tech-yellow" />
                {getStatusIcon(permissionStatus.notifications)}
              </div>
              <CardTitle className="text-xl">Notification Access</CardTitle>
              <CardDescription className="text-base">
                Required for battery and storage alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                <p className="text-sm">Smart Saver will notify you when:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Battery reaches critical levels (low or high)</li>
                  <li>• Device temperature is too high</li>
                  <li>• Storage is running low</li>
                  <li>• Data usage exceeds your limits</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleNotificationPermission}
                  className="w-full h-12"
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Bell className="h-5 w-5 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSkip("notifications")}
                  className="w-full"
                  disabled={isRequesting}
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Background Mode Step */}
        {currentStep === "background" && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-tech-green/10 rounded-full relative">
                <Cpu className="h-12 w-12 text-tech-green" />
                {getStatusIcon(permissionStatus.background)}
              </div>
              <CardTitle className="text-xl">Background Monitoring</CardTitle>
              <CardDescription className="text-base">
                Keep monitoring even when app is closed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                <p className="text-sm">Background monitoring allows:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Continuous battery health tracking</li>
                  <li>• Automatic alerts even when app is closed</li>
                  <li>• Historical data logging to Supabase</li>
                  <li>• Offline sync when connection returns</li>
                </ul>
              </div>

              <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                <p className="text-sm text-warning">
                  <strong>Note:</strong> For best results, disable battery optimization for Smart Saver in your device settings.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleBackgroundMode}
                  className="w-full h-12"
                >
                  <Check className="h-5 w-5 mr-2" />
                  I Understand, Continue
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSkip("background")}
                  className="w-full"
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Permission Summary Footer */}
        {currentStep !== "welcome" && (
          <div className="px-6 pb-6">
            <div className="flex justify-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-4">
              <div className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {permissionStatus.storage === "granted" ? (
                  <Check className="h-3 w-3 text-tech-green" />
                ) : permissionStatus.storage === "pending" ? (
                  <span>•</span>
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {permissionStatus.notifications === "granted" ? (
                  <Check className="h-3 w-3 text-tech-green" />
                ) : permissionStatus.notifications === "pending" ? (
                  <span>•</span>
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {permissionStatus.background === "granted" ? (
                  <Check className="h-3 w-3 text-tech-green" />
                ) : permissionStatus.background === "pending" ? (
                  <span>•</span>
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
