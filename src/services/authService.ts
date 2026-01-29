import { supabase } from "@/integrations/supabase/client";
import { Device } from "@capacitor/device";

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  deviceId: string | null;
  isLoading: boolean;
}

class AuthService {
  private userId: string | null = null;
  private deviceId: string | null = null;
  private authStateListeners: ((state: AuthState) => void)[] = [];

  // Initialize authentication - call this on app startup
  async initialize(): Promise<AuthState> {
    // Set up auth state listener FIRST
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this.userId = session.user.id;
        this.deviceId = session.user.user_metadata?.device_id || null;
      } else {
        this.userId = null;
        this.deviceId = null;
      }
      this.notifyListeners();
    });

    // Then check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      this.userId = session.user.id;
      this.deviceId = session.user.user_metadata?.device_id || null;
      return this.getState();
    }

    // No existing session - sign in anonymously
    return await this.signInAnonymously();
  }

  // Sign in anonymously with device ID in metadata
  async signInAnonymously(): Promise<AuthState> {
    try {
      // Get device ID
      let deviceId: string;
      try {
        const info = await Device.getId();
        deviceId = info.identifier;
      } catch {
        // Fallback for web - generate a stable ID
        let storedId = localStorage.getItem('device_id');
        if (!storedId) {
          storedId = `device_${crypto.randomUUID()}`;
          localStorage.setItem('device_id', storedId);
        }
        deviceId = storedId;
      }

      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            device_id: deviceId,
          }
        }
      });

      if (error) {
        console.error('Anonymous sign-in failed:', error);
        throw error;
      }

      if (data.user) {
        this.userId = data.user.id;
        this.deviceId = deviceId;
      }

      return this.getState();
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        isAuthenticated: false,
        userId: null,
        deviceId: null,
        isLoading: false,
      };
    }
  }

  // Get current user ID (auth.uid())
  getUserId(): string | null {
    return this.userId;
  }

  // Get device ID from metadata
  getDeviceId(): string | null {
    return this.deviceId;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.userId !== null;
  }

  // Get current auth state
  getState(): AuthState {
    return {
      isAuthenticated: this.userId !== null,
      userId: this.userId,
      deviceId: this.deviceId,
      isLoading: false,
    };
  }

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.userId = null;
    this.deviceId = null;
    this.notifyListeners();
  }

  // Subscribe to auth state changes
  onAuthStateChange(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.authStateListeners.forEach(listener => listener(state));
  }

  // Ensure user is authenticated before database operations
  async ensureAuthenticated(): Promise<string> {
    if (this.userId) {
      return this.userId;
    }

    const state = await this.initialize();
    if (!state.userId) {
      throw new Error('Authentication required');
    }

    return state.userId;
  }
}

export const authService = new AuthService();
