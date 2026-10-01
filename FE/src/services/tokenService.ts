import type { TokenPair, User } from "../types/auth";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "authUser";
const SESSION_KEY = "authSessionId";

export const tokenService = {
  // Remains stable during token refresh, changes after logout/account replacement.
  getSessionId(): string | null {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY) && !localStorage.getItem(REFRESH_TOKEN_KEY)) return null;
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  },
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getStoredUser(): User | null {
    const value = localStorage.getItem(USER_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },

  setSession(tokens: TokenPair, user: User): void {
    const previousUser = this.getStoredUser();
    if (!this.getSessionId() || previousUser?.id !== user.id) {
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  updateUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  },
};
