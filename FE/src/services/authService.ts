import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type {
  AuthResult,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthResult> {
    const response = await api.post<ApiResponse<AuthResult>>("/auth/register", payload);
    return response.data.result;
  },

  async login(payload: LoginRequest): Promise<AuthResult> {
    const response = await api.post<ApiResponse<AuthResult>>("/auth/login", payload);
    return response.data.result;
  },

  async loginOperator(payload: LoginRequest): Promise<AuthResult> {
    const response = await api.post<ApiResponse<AuthResult>>("/auth/management/login", payload);
    return response.data.result;
  },

  async loginWithGoogle(payload: GoogleLoginRequest): Promise<AuthResult> {
    const response = await api.post<ApiResponse<AuthResult>>("/auth/google", payload);
    return response.data.result;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post("/auth/logout", { refreshToken });
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>("/users/me");
    return response.data.result;
  },
};
