import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  createInvitation,
  validateInvitation,
  useInvitation,
  getInvitations,
  revokeInvitation,
  InvitationError
} from "../services/invitation.service.js";
import { createUserInJellyfin, AuthError } from "../services/auth.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { sendInvitationEmail } from "../services/email.service.js";

const prisma = new PrismaClient();
const router = Router();

// PUBLIC: Validate invitation
router.get("/:token/validate", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string;
    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const invitation = await validateInvitation(token);
    
    // Gib nur sichere, notwendige Daten zurueck
    res.json({
      valid: true,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      maxUses: invitation.maxUses,
      useCount: invitation.useCount
    });
  } catch (err) {
    if (err instanceof InvitationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Validation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUBLIC: Use invitation (create user)
router.post("/use", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, username, password } = req.body as {
      token?: string;
      username?: string;
      password?: string;
    };

    if (!token || !username || !password) {
      res.status(400).json({ error: "Token, username, and password are required" });
      return;
    }

    // Validiere Token zuerst (wirft Error wenn ungueltig)
    await validateInvitation(token);

    // Erstelle User in Jellyfin
    const jellyfinUserId = await createUserInJellyfin(username, password);

    // Markiere Einladung als verwendet
    await useInvitation(token, jellyfinUserId);

    res.json({ success: true, jellyfinUserId });
  } catch (err) {
    if (err instanceof InvitationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Use invitation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PRIVATE: Alle weiteren Routen benoetigen Admin-Auth
router.use(authMiddleware);

// GET / - List invitations
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    // Da wir als Admin alle Rechte haben, koennten wir alle oder nur eigene laden.
    // Gem. Anforderung: "listet alle (oder eigene) Einladungen auf".
    // Hier laden wir der Einfachheit halber alle (als Admin).
    const invitations = await getInvitations();
    res.json(invitations);
  } catch (err) {
    console.error("Get invitations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST / - Create invitation
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, expiresInDays, maxUses, note } = req.body as {
      email?: string;
      expiresInDays?: number;
      maxUses?: number;
      note?: string;
    };

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

    const invitation = await createInvitation({
      email,
      expiresInDays: expiresInDays ?? 7,
      maxUses: maxUses ?? 1,
      note,
      createdBy: user.id
    });

    if (email) {
      const inviteUrl = `${process.env.INVITE_BASE_URL ?? "http://localhost:5173"}/invite/${invitation.token}`;
      await sendInvitationEmail({
        to: email,
        inviteUrl,
        inviterName: user.username,
        expiresAt: invitation.expiresAt,
        note
      }).catch(err => {
        console.error("Failed to send invitation email:", err);
      });
    }

    res.json(invitation);
  } catch (err) {
    console.error("Create invitation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:id - Revoke invitation
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: "ID is required" });
      return;
    }

    const invitation = await revokeInvitation(id);
    res.json(invitation);
  } catch (err) {
    if (err instanceof InvitationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Revoke invitation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /:id/resend - Resend invitation email
router.post("/:id/resend", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: "ID is required" });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: { creator: true }
    });

    if (!invitation) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }

    if (!invitation.email) {
      res.status(400).json({ error: "Invitation has no email address associated" });
      return;
    }

    if (invitation.revokedAt) {
      res.status(400).json({ error: "Cannot resend revoked invitation" });
      return;
    }

    const inviteUrl = `${process.env.INVITE_BASE_URL ?? "http://localhost:5173"}/invite/${invitation.token}`;
    
    await sendInvitationEmail({
      to: invitation.email,
      inviteUrl,
      inviterName: invitation.creator.username,
      expiresAt: invitation.expiresAt,
      note: invitation.note ?? undefined
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Resend invitation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
