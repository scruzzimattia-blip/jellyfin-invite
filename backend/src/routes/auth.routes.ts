import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  authenticateWithJellyfin,
  isJellyfinAdmin,
  createToken,
  AuthError
} from "../services/auth.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const prisma = new PrismaClient();
const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const authResult = await authenticateWithJellyfin(username, password);

    const isAdmin = await isJellyfinAdmin(authResult.userId, authResult.accessToken);
    if (!isAdmin) {
      res.status(403).json({ error: "Only Jellyfin administrators can access this system" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { jellyfinUserId: authResult.userId },
      update: { username: authResult.username, isAdmin: true, lastLogin: new Date() },
      create: {
        jellyfinUserId: authResult.userId,
        username: authResult.username,
        isAdmin: true,
        lastLogin: new Date()
      }
    });

    const token = createToken({
      jellyfinUserId: authResult.userId,
      username: authResult.username,
      jellyfinToken: authResult.accessToken
    });

    res.json({
      token,
      user: {
        id: user.id,
        jellyfinUserId: user.jellyfinUserId,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.user;
    if (!payload) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { jellyfinUserId: payload.jellyfinUserId }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      jellyfinUserId: user.jellyfinUserId,
      username: user.username,
      isAdmin: user.isAdmin,
      lastLogin: user.lastLogin
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
