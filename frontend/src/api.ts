import axios from "axios";

export interface AuthUser {
  id: string;
  jellyfinUserId: string;
  username: string;
  isAdmin: boolean;
  lastLogin?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface InvitationSummary {
  id: string;
  token: string;
  email?: string | null;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  revokedAt?: string | null;
}

export const api = axios.create({
  baseURL: "/api"
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("jellyfinInviteToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
