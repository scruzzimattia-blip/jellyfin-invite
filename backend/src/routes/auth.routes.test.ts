import { jest } from "@jest/globals";
import type { Express } from "express";
import nock from "nock";
import request from "supertest";

const prismaMock = {
  user: {
    upsert: jest.fn<() => Promise<unknown>>(),
    findUnique: jest.fn<() => Promise<unknown>>()
  },
  invitation: {
    findMany: jest.fn<() => Promise<unknown[]>>()
  }
};

const jestWithEsModuleMocks = jest as typeof jest & {
  unstable_mockModule: (moduleName: string, moduleFactory: () => unknown) => void;
};

jestWithEsModuleMocks.unstable_mockModule("@prisma/client", () => ({
  PrismaClient: jest.fn(() => prismaMock)
}));

describe("auth routes", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.JELLYFIN_URL = "http://jellyfin.test";
    process.env.JWT_SECRET = "route-test-secret";
    app = (await import("../app.js")).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it("logs in a Jellyfin admin and returns a JWT", async () => {
    prismaMock.user.upsert.mockResolvedValue({
      id: "local-user-id",
      jellyfinUserId: "jellyfin-user-id",
      username: "admin",
      isAdmin: true
    });

    nock("http://jellyfin.test")
      .post("/Users/AuthenticateByName", { Username: "admin", Pw: "secret-password" })
      .reply(200, {
        AccessToken: "jellyfin-access-token",
        User: { Id: "jellyfin-user-id", Name: "admin" }
      });

    nock("http://jellyfin.test")
      .get("/Users/jellyfin-user-id")
      .reply(200, {
        Policy: { IsAdministrator: true }
      });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "secret-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toEqual({
      id: "local-user-id",
      jellyfinUserId: "jellyfin-user-id",
      username: "admin",
      isAdmin: true
    });
  });

  it("rejects non-admin Jellyfin users", async () => {
    nock("http://jellyfin.test")
      .post("/Users/AuthenticateByName")
      .reply(200, {
        AccessToken: "jellyfin-access-token",
        User: { Id: "jellyfin-user-id", Name: "viewer" }
      });

    nock("http://jellyfin.test")
      .get("/Users/jellyfin-user-id")
      .reply(200, {
        Policy: { IsAdministrator: false }
      });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "viewer", password: "secret-password" })
      .expect(403);

    expect(response.body).toEqual({
      error: "Only Jellyfin administrators can access this system"
    });
  });
});
