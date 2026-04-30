import { randomBytes } from "crypto";
import { PrismaClient, type Invitation } from "@prisma/client";

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

export async function createInvitation(data: {
  email?: string;
  expiresInDays: number;
  maxUses: number;
  note?: string;
  createdBy: string;
}) {
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

  return prisma.invitation.create({
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

export async function validateInvitation(token: string): Promise<Invitation> {
  const invitation = await prisma.invitation.findUnique({
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

export async function useInvitation(token: string, jellyfinUserId: string): Promise<void> {
  const invitation = await validateInvitation(token);

  await prisma.$transaction([
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { useCount: { increment: 1 } }
    }),
    prisma.invitationUse.create({
      data: {
        invitationId: invitation.id,
        jellyfinUserId
      }
    })
  ]);
}

export async function getInvitations(createdBy?: string) {
  if (createdBy) {
    return prisma.invitation.findMany({
      where: { createdBy },
      include: { uses: true },
      orderBy: { createdAt: "desc" }
    });
  }
  return prisma.invitation.findMany({
    include: { uses: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function revokeInvitation(id: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    throw new InvitationError("Invitation not found", 404);
  }
  if (invitation.revokedAt) {
    throw new InvitationError("Invitation is already revoked", 400);
  }

  return prisma.invitation.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
}
