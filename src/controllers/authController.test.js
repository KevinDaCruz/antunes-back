import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../config/email.js", () => ({
  getResendClient: vi.fn(),
}));

const { getResendClient } = await import("../config/email.js");
const { createApp } = await import("../app.js");
const { User } = await import("../models/User.js");

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

describe("POST /api/auth/forgot-password", () => {
  let fakeResend;

  beforeEach(() => {
    fakeResend = { emails: { send: vi.fn().mockResolvedValue({}) } };
    getResendClient.mockReturnValue(fakeResend);
  });

  it("sends a reset email and stores a hashed token for an existing account", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validSignupPayload.email });

    expect(response.status).toBe(200);
    expect(fakeResend.emails.send).toHaveBeenCalledOnce();

    const user = await User.findOne({ email: validSignupPayload.email }).select(
      "+resetPasswordTokenHash +resetPasswordExpiresAt",
    );
    expect(user.resetPasswordTokenHash).toBeTruthy();
    expect(user.resetPasswordExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns the same generic response for an unknown email, without sending anything", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "unknown@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Si un compte existe");
    expect(fakeResend.emails.send).not.toHaveBeenCalled();
  });

  it("still returns success even if sending the email fails", async () => {
    fakeResend.emails.send.mockRejectedValue(new Error("Resend down"));
    await request(app).post("/api/auth/signup").send(validSignupPayload);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validSignupPayload.email });

    expect(response.status).toBe(200);
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    getResendClient.mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({}) },
    });
  });

  async function requestReset(email) {
    await request(app).post("/api/auth/forgot-password").send({ email });
    const user = await User.findOne({ email }).select(
      "+resetPasswordTokenHash",
    );
    // Le token brut n'est jamais stocké : on le récupère depuis l'e-mail
    // simulé, exactement comme le ferait un utilisateur en cliquant le lien.
    const rawToken = getResendClient.mock.results.at(-1).value.emails.send.mock
      .calls.at(-1)[0].html.match(/token=([a-f0-9]+)/)[1];

    return { user, rawToken };
  }

  it("rejects an invalid token", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", password: "newpassword456" });

    expect(response.status).toBe(400);
  });

  it("resets the password with a valid token and allows logging in with it", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const { rawToken } = await requestReset(validSignupPayload.email);

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "newpassword456" });

    expect(resetResponse.status).toBe(200);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: validSignupPayload.email,
      password: "newpassword456",
    });

    expect(loginResponse.status).toBe(200);
  });

  it("rejects reusing the same token twice", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const { rawToken } = await requestReset(validSignupPayload.email);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "newpassword456" });

    const secondAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "anotherpassword789" });

    expect(secondAttempt.status).toBe(400);
  });
});
