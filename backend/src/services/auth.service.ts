import jwt from "jsonwebtoken";

const JELLYFIN_URL = process.env.JELLYFIN_URL ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

export interface JellyfinAuthResult {
  accessToken: string;
  userId: string;
  username: string;
}

export interface JwtPayload {
  jellyfinUserId: string;
  username: string;
  jellyfinToken: string;
}

export async function authenticateWithJellyfin(
  username: string,
  password: string
): Promise<JellyfinAuthResult> {
  const response = await fetch(`${JELLYFIN_URL}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        'MediaBrowser Client="Jellyfin Invite", Device="Server", DeviceId="jellyfin-invite-system", Version="0.1.0"'
    },
    body: JSON.stringify({ Username: username, Pw: password })
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) {
      throw new AuthError("Invalid credentials", 401);
    }
    throw new AuthError(`Jellyfin authentication failed (HTTP ${status})`, 502);
  }

  const data = (await response.json()) as {
    AccessToken: string;
    User: { Id: string; Name: string };
  };

  return {
    accessToken: data.AccessToken,
    userId: data.User.Id,
    username: data.User.Name
  };
}

export async function isJellyfinAdmin(userId: string, accessToken: string): Promise<boolean> {
  const response = await fetch(`${JELLYFIN_URL}/Users/${userId}`, {
    headers: {
      Authorization:
        `MediaBrowser Client="Jellyfin Invite", Device="Server", DeviceId="jellyfin-invite-system", Version="0.1.0", Token="${accessToken}"`
    }
  });

  if (!response.ok) {
    throw new AuthError("Failed to verify admin status", 502);
  }

  const user = (await response.json()) as { Policy: { IsAdministrator: boolean } };
  return user.Policy.IsAdministrator;
}

export function createToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
