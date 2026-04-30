import type { Invitation, PrismaClient } from "@prisma/client";
import { jest } from "@jest/globals";
import { InvitationError, InvitationService } from "./invitation.service.js";

function createInvitationFixture(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "invitation-id",
    token: "token",
    createdBy: "user-id",
    email: "guest@example.com",
    expiresAt: new Date(Date.now() + 86_400_000),
    maxUses: 1,
    useCount: 0,
    note: null,
    createdAt: new Date(),
    revokedAt: null,
    ...overrides
  };
}

type CreateInvitationInput = { data: Record<string, unknown> };

function createDbMock(invitation: unknown) {
  return {
    invitation,
    invitationUse: {
      create: jest.fn()
    },
    $transaction: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  } as unknown as PrismaClient;
}

describe("InvitationService", () => {
  it("generates a secure token and stores a new invitation", async () => {
    const create = jest
      .fn<(input: CreateInvitationInput) => Record<string, unknown>>()
      .mockImplementation(({ data }) => ({ id: "new-id", ...data }));
    const service = new InvitationService(createDbMock({ create }));

    const invitation = await service.createInvitation({
      email: "guest@example.com",
      expiresInDays: 7,
      maxUses: 2,
      note: "Welcome",
      createdBy: "admin-id"
    });

    expect(invitation.token).toMatch(/^[a-f0-9]{32}$/);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "guest@example.com",
          maxUses: 2,
          note: "Welcome",
          createdBy: "admin-id"
        })
      })
    );
  });

  it("validates active invitations", async () => {
    const findUnique = jest.fn<() => Promise<Invitation>>().mockResolvedValue(createInvitationFixture());
    const service = new InvitationService(createDbMock({ findUnique }));

    await expect(service.validateInvitation("token")).resolves.toMatchObject({ token: "token" });
  });

  it("rejects expired invitations", async () => {
    const findUnique = jest
      .fn<() => Promise<Invitation>>()
      .mockResolvedValue(createInvitationFixture({ expiresAt: new Date(Date.now() - 1_000) }));
    const service = new InvitationService(createDbMock({ findUnique }));

    await expect(service.validateInvitation("token")).rejects.toEqual(
      new InvitationError("Invitation has expired", 403)
    );
  });

  it("rejects invitations that reached max uses", async () => {
    const findUnique = jest
      .fn<() => Promise<Invitation>>()
      .mockResolvedValue(createInvitationFixture({ useCount: 1, maxUses: 1 }));
    const service = new InvitationService(createDbMock({ findUnique }));

    await expect(service.validateInvitation("token")).rejects.toEqual(
      new InvitationError("Invitation usage limit reached", 403)
    );
  });
});
