import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { authService, AuthState } from "@/services/authService";

interface AuthContextType extends AuthState {
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    deviceId: null,
    isLoading: true,
  });

  const initialize = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const state = await authService.initialize();
    setAuthState({ ...state, isLoading: false });
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setAuthState({
      isAuthenticated: false,
      userId: null,
      deviceId: null,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    initialize();

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((state) => {
      setAuthState({ ...state, isLoading: false });
    });

    return unsubscribe;
  }, [initialize]);

  return (
    <AuthContext.Provider value={{ ...authState, initialize, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
