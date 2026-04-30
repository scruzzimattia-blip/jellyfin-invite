import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { authMiddleware as AuthMiddleware } from "./auth.middleware.js";

describe("authMiddleware", () => {
  let authMiddleware: typeof AuthMiddleware;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    authMiddleware = (await import("./auth.middleware.js")).authMiddleware;
  });

  function createTestApp() {
    const app = express();
    app.get("/protected", authMiddleware, (req, res) => {
      res.json({ user: req.user });
    });
    return app;
  }

  it("accepts a valid JWT and attaches the user payload", async () => {
    const token = jwt.sign(
      {
        jellyfinUserId: "jellyfin-user-id",
        username: "admin",
        jellyfinToken: "jellyfin-token"
      },
      "test-secret"
    );

    const response = await request(createTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.user).toMatchObject({
      jellyfinUserId: "jellyfin-user-id",
      username: "admin",
      jellyfinToken: "jellyfin-token"
    });
  });

  it("rejects an invalid JWT", async () => {
    const response = await request(createTestApp())
      .get("/protected")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body).toEqual({ error: "Invalid or expired token" });
  });
});
