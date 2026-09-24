import { afterEach, describe, expect, it } from "vitest";
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

describe("GET /api/health", () => {
  it("responds with ok", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
