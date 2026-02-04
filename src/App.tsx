import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { StorageProvider } from "@/contexts/StorageContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { ScanningOverlay } from "@/components/ScanningOverlay";
import { BackgroundService } from "@/services/BackgroundService";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Inner component that uses onboarding context
function AppContent() {
  const { hasCompletedOnboarding, isCheckingOnboarding } = useOnboarding();

  // Initialize background service after onboarding is complete
  useEffect(() => {
    if (hasCompletedOnboarding) {
      BackgroundService.initialize().catch(console.error);
    }
  }, [hasCompletedOnboarding]);

  // Show loading state while checking onboarding status
  if (isCheckingOnboarding) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding wizard if not completed
  if (!hasCompletedOnboarding) {
    return <OnboardingWizard />;
  }

  // Show main app
  return (
    <>
      <ScanningOverlay />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnboardingProvider>
        <StorageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </StorageProvider>
      </OnboardingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
