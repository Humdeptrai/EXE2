import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_SESSION_EXPIRED_EVENT } from "../config/axios";
import { authService } from "../services/authService";
import { tokenService } from "../services/tokenService";
import { userService } from "../services/userService";
import type {
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
  UserMode,
} from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  register: (payload: RegisterRequest) => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  loginWithGoogle: (payload: GoogleLoginRequest) => Promise<void>;
  updateProfile: (payload: UpdateProfileRequest) => Promise<User>;
  uploadAvatar: (file: File) => Promise<User>;
  deleteAvatar: () => Promise<User>;
  switchMode: (mode: UserMode) => Promise<User>;
  refreshCurrentUser: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => tokenService.getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistUser = useCallback((nextUser: User) => {
    tokenService.updateUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const saveAuthResult = useCallback((result: Awaited<ReturnType<typeof authService.login>>) => {
    tokenService.setSession(result.tokens, result.user);
    setUser(result.user);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const currentUser = await authService.getMe();
    return persistUser(currentUser);
  }, [persistUser]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!tokenService.getAccessToken() && !tokenService.getRefreshToken()) {
        if (active) setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await authService.getMe();
        if (active) persistUser(currentUser);
      } catch {
        tokenService.clearSession();
        if (active) setUser(null);
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [persistUser]);

  useEffect(() => {
    const handleExpiredSession = () => setUser(null);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    saveAuthResult(await authService.register(payload));
  }, [saveAuthResult]);

  const login = useCallback(async (payload: LoginRequest) => {
    saveAuthResult(await authService.login(payload));
  }, [saveAuthResult]);

  const loginWithGoogle = useCallback(async (payload: GoogleLoginRequest) => {
    saveAuthResult(await authService.loginWithGoogle(payload));
  }, [saveAuthResult]);

  const updateProfile = useCallback(async (payload: UpdateProfileRequest) => {
    return persistUser(await userService.updateProfile(payload));
  }, [persistUser]);

  const uploadAvatar = useCallback(async (file: File) => {
    return persistUser(await userService.uploadAvatar(file));
  }, [persistUser]);

  const deleteAvatar = useCallback(async () => {
    return persistUser(await userService.deleteAvatar());
  }, [persistUser]);

  const switchMode = useCallback(async (mode: UserMode) => {
    return persistUser(await userService.updateMode({ mode }));
  }, [persistUser]);

  const logout = useCallback(async () => {
    const refreshToken = tokenService.getRefreshToken();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      tokenService.clearSession();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    register,
    login,
    loginWithGoogle,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    switchMode,
    refreshCurrentUser,
    logout,
  }), [
    user,
    isBootstrapping,
    register,
    login,
    loginWithGoogle,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    switchMode,
    refreshCurrentUser,
    logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
