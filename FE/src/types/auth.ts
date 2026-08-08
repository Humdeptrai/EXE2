export type UserRole = "USER" | "ADMIN";
export type UserMode = "CONSUMER" | "PROVIDER";
export type AuthProvider = "LOCAL" | "GOOGLE" | "BOTH";

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  tags: string[];
  profileCompleted: boolean;
  authProvider: AuthProvider;
  role: UserRole;
  currentMode: UserMode;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export interface RegisterRequest {
  fullName: string;
  identifier: string;
  password: string;
  termsAccepted: boolean;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone: string;
  avatarUrl: string;
  bio: string;
  location: string;
  tags: string[];
}

export interface UpdateModeRequest {
  mode: UserMode;
}
