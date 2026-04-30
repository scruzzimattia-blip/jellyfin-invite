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
  createdBy: string;
  email?: string | null;
  expiresAt: string;
  createdAt?: string;
  maxUses: number;
  useCount: number;
  note?: string | null;
  revokedAt?: string | null;
}

export interface CreateInvitationPayload {
  email?: string;
  expiresInDays: number;
  maxUses: number;
  note?: string;
}

export interface InvitationValidationResponse {
  valid: boolean;
  email?: string | null;
  expiresAt: string;
  maxUses: number;
  useCount: number;
}

export interface UseInvitationResponse {
  success: boolean;
  jellyfinUserId: string;
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
