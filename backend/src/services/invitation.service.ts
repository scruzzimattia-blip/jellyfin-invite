import { randomBytes } from "crypto";
import { PrismaClient, type Invitation, type PrismaClient as PrismaClientType } from "@prisma/client";

const prisma = new PrismaClient();

export class InvitationError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "InvitationError";
  }
}

export interface CreateInvitationData {
  email?: string;
  expiresInDays: number;
  maxUses: number;
  note?: string;
  createdBy: string;
}

export class InvitationService {
  constructor(private readonly db: PrismaClientType) {}

  async createInvitation(data: CreateInvitationData) {
    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    return this.db.invitation.create({
      data: {
        token,
        email: data.email,
        expiresAt,
        maxUses: data.maxUses,
        note: data.note,
        createdBy: data.createdBy
      }
    });
  }

  async validateInvitation(token: string): Promise<Invitation> {
    const invitation = await this.db.invitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      throw new InvitationError("Invitation not found or invalid", 404);
    }

    if (invitation.revokedAt) {
      throw new InvitationError("Invitation has been revoked", 403);
    }

    if (new Date() > invitation.expiresAt) {
      throw new InvitationError("Invitation has expired", 403);
    }

    if (invitation.useCount >= invitation.maxUses) {
      throw new InvitationError("Invitation usage limit reached", 403);
    }

    return invitation;
  }

  async useInvitation(token: string, jellyfinUserId: string): Promise<void> {
    const invitation = await this.validateInvitation(token);

    await this.db.$transaction([
      this.db.invitation.update({
        where: { id: invitation.id },
        data: { useCount: { increment: 1 } }
      }),
      this.db.invitationUse.create({
        data: {
          invitationId: invitation.id,
          jellyfinUserId
        }
      })
    ]);
  }

  async getInvitations(createdBy?: string) {
    if (createdBy) {
      return this.db.invitation.findMany({
        where: { createdBy },
        include: { uses: true },
        orderBy: { createdAt: "desc" }
      });
    }
    return this.db.invitation.findMany({
      include: { uses: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async revokeInvitation(id: string) {
    const invitation = await this.db.invitation.findUnique({ where: { id } });
    if (!invitation) {
      throw new InvitationError("Invitation not found", 404);
    }
    if (invitation.revokedAt) {
      throw new InvitationError("Invitation is already revoked", 400);
    }

    return this.db.invitation.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  }
}

const invitationService = new InvitationService(prisma);

export const createInvitation = invitationService.createInvitation.bind(invitationService);
export const validateInvitation = invitationService.validateInvitation.bind(invitationService);
export const useInvitation = invitationService.useInvitation.bind(invitationService);
export const getInvitations = invitationService.getInvitations.bind(invitationService);
export const revokeInvitation = invitationService.revokeInvitation.bind(invitationService);
