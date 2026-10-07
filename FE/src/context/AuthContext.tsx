import { createContext, useContext } from "react";
import type {
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
  UserMode,
} from "../types/auth";

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  register: (payload: RegisterRequest) => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  loginOperator: (payload: LoginRequest) => Promise<User>;
  loginWithGoogle: (payload: GoogleLoginRequest) => Promise<void>;
  updateProfile: (payload: UpdateProfileRequest) => Promise<User>;
  uploadAvatar: (file: File) => Promise<User>;
  deleteAvatar: () => Promise<User>;
  switchMode: (mode: UserMode) => Promise<User>;
  refreshCurrentUser: () => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
