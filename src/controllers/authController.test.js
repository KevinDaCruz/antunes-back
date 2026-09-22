import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

const validSignupPayload = {
  firstName: "Kevin",
  lastName: "Da Cruz",
  pseudo: "kevintech",
  email: "kevin@example.com",
  password: "azerty123",
};

describe("POST /api/auth/signup", () => {
  it("creates a new account and returns a token", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);

    expect(response.status).toBe(201);
    expect(response.body.user.pseudo).toBe("kevintech");
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(typeof response.body.token).toBe("string");
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignupPayload, email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);

    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignupPayload, pseudo: "another" });

    expect(response.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);

    const response = await request(app).post("/api/auth/login").send({
      email: validSignupPayload.email,
      password: validSignupPayload.password,
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe("string");
  });

  it("rejects a wrong password", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);

    const response = await request(app).post("/api/auth/login").send({
      email: validSignupPayload.email,
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
  });

  it("rejects an unknown email without leaking whether it exists", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "whatever123",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Identifiants invalides.");
  });
});

describe("GET /api/auth/me", () => {
  it("rejects requests without a token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signupResponse.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(validSignupPayload.email);
  });

  it("rejects a malformed token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
  });
});
