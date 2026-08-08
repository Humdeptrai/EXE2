import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type {
  UpdateModeRequest,
  UpdateProfileRequest,
  User,
} from "../types/auth";

export const userService = {
  async updateProfile(payload: UpdateProfileRequest): Promise<User> {
    const response = await api.patch<ApiResponse<User>>("/users/me", payload);
    return response.data.result;
  },

  async updateMode(payload: UpdateModeRequest): Promise<User> {
    const response = await api.patch<ApiResponse<User>>("/users/me/mode", payload);
    return response.data.result;
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ApiResponse<User>>("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.result;
  },

  async deleteAvatar(): Promise<User> {
    const response = await api.delete<ApiResponse<User>>("/users/me/avatar");
    return response.data.result;
  },
};
