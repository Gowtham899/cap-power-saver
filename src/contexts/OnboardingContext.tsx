import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";

export type OnboardingStep = "welcome" | "storage" | "notifications" | "background" | "complete";

export interface PermissionStatus {
  storage: "pending" | "granted" | "denied" | "skipped";
  notifications: "pending" | "granted" | "denied" | "skipped";
  background: "pending" | "granted" | "denied" | "skipped";
}

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  isCheckingOnboarding: boolean;
  currentStep: OnboardingStep;
  permissionStatus: PermissionStatus;
  setCurrentStep: (step: OnboardingStep) => void;
  requestStoragePermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  acknowledgeBackgroundMode: () => void;
  skipPermission: (permission: keyof PermissionStatus) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const ONBOARDING_KEY = "hasCompletedOnboarding";

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    storage: "pending",
    notifications: "pending",
    background: "pending",
  });

  const isNative = Capacitor.isNativePlatform();

  // Check if onboarding was already completed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const result = await Preferences.get({ key: ONBOARDING_KEY });
        const completed = result.value === "true";
        setHasCompletedOnboarding(completed);

        // If not completed and on web, auto-complete (skip onboarding for web)
        if (!completed && !isNative) {
          setHasCompletedOnboarding(true);
          await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        // Default to completed if check fails
        setHasCompletedOnboarding(true);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [isNative]);

  const requestStoragePermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setPermissionStatus(prev => ({ ...prev, storage: "granted" }));
      return true;
    }

    try {
      const result = await Filesystem.requestPermissions();
      const granted = result.publicStorage === "granted";
      setPermissionStatus(prev => ({
        ...prev,
        storage: granted ? "granted" : "denied",
      }));
      return granted;
    } catch (error) {
      console.error("Storage permission request failed:", error);
      setPermissionStatus(prev => ({ ...prev, storage: "denied" }));
      return false;
    }
  }, [isNative]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setPermissionStatus(prev => ({ ...prev, notifications: "granted" }));
      return true;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === "granted";
      setPermissionStatus(prev => ({
        ...prev,
        notifications: granted ? "granted" : "denied",
      }));
      return granted;
    } catch (error) {
      console.error("Notification permission request failed:", error);
      setPermissionStatus(prev => ({ ...prev, notifications: "denied" }));
      return false;
    }
  }, [isNative]);

  const acknowledgeBackgroundMode = useCallback(() => {
    setPermissionStatus(prev => ({ ...prev, background: "granted" }));
  }, []);

  const skipPermission = useCallback((permission: keyof PermissionStatus) => {
    setPermissionStatus(prev => ({ ...prev, [permission]: "skipped" }));
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
      setHasCompletedOnboarding(true);
      setCurrentStep("complete");
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
      // Still complete locally even if save fails
      setHasCompletedOnboarding(true);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await Preferences.remove({ key: ONBOARDING_KEY });
      setHasCompletedOnboarding(false);
      setCurrentStep("welcome");
      setPermissionStatus({
        storage: "pending",
        notifications: "pending",
        background: "pending",
      });
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        isCheckingOnboarding,
        currentStep,
        permissionStatus,
        setCurrentStep,
        requestStoragePermission,
        requestNotificationPermission,
        acknowledgeBackgroundMode,
        skipPermission,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
