import { afterEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "./app.js";

describe("rate limiting (outside the test environment)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns 429 once the auth rate limit is exceeded", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();

    let lastResponse;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      lastResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "wrong" });
    }

    expect(lastResponse.status).toBe(429);
  });

  it("does not count GET /api/auth/me, called on every page load", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();

    let lastResponse;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      lastResponse = await request(app).get("/api/auth/me");
    }

    // Sans jeton, la route répond 401 : jamais 429.
    expect(lastResponse.status).toBe(401);
  });
});

describe("trust proxy", () => {
  it("trusts exactly one hop, so req.ip reflects Render's X-Forwarded-For correctly", async () => {
    const app = createApp();

    // Render place l'app derrière un unique proxy inversé. Sans ce réglage,
    // express-rate-limit ne peut pas identifier les clients de façon fiable
    // (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) et la limite anti brute-force sur
    // /api/auth devient inefficace en production.
    expect(app.get("trust proxy")).toBe(1);
  });
});

describe("request body errors", () => {
  it("answers 413, not 500, when the body is larger than 10 kB", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "a".repeat(20000) });

    expect(response.status).toBe(413);
    expect(response.body.error.message).toBe("La requête est trop volumineuse.");
  });

  it("answers 400 when the JSON is malformed", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    expect(response.status).toBe(400);
  });
});

describe("GET /api/health", () => {
  it("responds with ok", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "connected" });
  });

  it("responds with 503 when the database connection is lost", async () => {
    const app = createApp();
    const readyStateSpy = vi
      .spyOn(mongoose.connection, "readyState", "get")
      .mockReturnValue(0);

    const response = await request(app).get("/api/health");
    readyStateSpy.mockRestore();

    expect(response.status).toBe(503);
    expect(response.body.database).toBe("disconnected");
  });
});
