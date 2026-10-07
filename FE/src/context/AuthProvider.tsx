import {
  type PropsWithChildren,
  useCallback,
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

import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => tokenService.getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistUser = useCallback((nextUser: User) => {
    tokenService.updateUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const saveAuthResult = useCallback((result: Awaited<ReturnType<typeof authService.login>>, sessionId: string | null) => {
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    tokenService.setSession(result.tokens, result.user);
    setUser(result.user);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const sessionId = tokenService.getSessionId();
    const currentUser = await authService.getMe();
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    return persistUser(currentUser);
  }, [persistUser]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const sessionId = tokenService.getSessionId();
      if (!tokenService.getAccessToken() && !tokenService.getRefreshToken()) {
        if (active) { setUser(null); setIsBootstrapping(false); }
        return;
      }

      try {
        const currentUser = await authService.getMe();
        if (active && sessionId === tokenService.getSessionId()) persistUser(currentUser);
      } catch {
        if (active && sessionId === tokenService.getSessionId()) {
          tokenService.clearSession();
          setUser(null);
        }
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
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === null || event.key === "authUser" || event.key === "accessToken" || event.key === "refreshToken")) {
        setUser(tokenService.getSessionId() ? tokenService.getStoredUser() : null);
      }
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    const sessionId = tokenService.getSessionId();
    saveAuthResult(await authService.register(payload), sessionId);
  }, [saveAuthResult]);

  const login = useCallback(async (payload: LoginRequest) => {
    const sessionId = tokenService.getSessionId();
    saveAuthResult(await authService.login(payload), sessionId);
  }, [saveAuthResult]);

  const loginOperator = useCallback(async (payload: LoginRequest) => {
    const sessionId = tokenService.getSessionId();
    const result = await authService.loginOperator(payload);
    saveAuthResult(result, sessionId);
    return result.user;
  }, [saveAuthResult]);

  const loginWithGoogle = useCallback(async (payload: GoogleLoginRequest) => {
    const sessionId = tokenService.getSessionId();
    saveAuthResult(await authService.loginWithGoogle(payload), sessionId);
  }, [saveAuthResult]);

  const updateProfile = useCallback(async (payload: UpdateProfileRequest) => {
    const sessionId = tokenService.getSessionId();
    const nextUser = await userService.updateProfile(payload);
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    return persistUser(nextUser);
  }, [persistUser]);

  const uploadAvatar = useCallback(async (file: File) => {
    const sessionId = tokenService.getSessionId();
    const nextUser = await userService.uploadAvatar(file);
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    return persistUser(nextUser);
  }, [persistUser]);

  const deleteAvatar = useCallback(async () => {
    const sessionId = tokenService.getSessionId();
    const nextUser = await userService.deleteAvatar();
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    return persistUser(nextUser);
  }, [persistUser]);

  const switchMode = useCallback(async (mode: UserMode) => {
    const sessionId = tokenService.getSessionId();
    const nextUser = await userService.updateMode({ mode });
    if (sessionId !== tokenService.getSessionId()) throw new Error("Authentication session changed");
    return persistUser(nextUser);
  }, [persistUser]);

  const logout = useCallback(async () => {
    const refreshToken = tokenService.getRefreshToken();
    // Invalidate locally before awaiting the server so late requests cannot restore this account.
    tokenService.clearSession();
    setUser(null);
    if (refreshToken) await authService.logout(refreshToken);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    register,
    login,
    loginOperator,
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
    loginOperator,
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

