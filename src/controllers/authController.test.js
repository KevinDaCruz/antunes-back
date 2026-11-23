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
  password: "Azerty-2026!x",
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

  it.each([
    ["too short", "Court-1!"],
    ["without an uppercase letter", "azerty-2026!x"],
    ["without a lowercase letter", "AZERTY-2026!X"],
    ["without a digit", "Azerty-deux!x"],
    ["without a special character", "Azerty2026xyz"],
  ])("rejects a password %s (CNIL rule)", async (_label, password) => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignupPayload, password });

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
    // Le premier e-mail est la confirmation d'adresse envoyée à l'inscription.
    expect(fakeResend.emails.send).toHaveBeenCalledTimes(2);
    expect(fakeResend.emails.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subject: "Réinitialise ton mot de passe Antunes",
      }),
    );

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
      .send({ token: "not-a-real-token", password: "NouveauMdp-456!" });

    expect(response.status).toBe(400);
  });

  it("resets the password with a valid token and allows logging in with it", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const { rawToken } = await requestReset(validSignupPayload.email);

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "NouveauMdp-456!" });

    expect(resetResponse.status).toBe(200);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: validSignupPayload.email,
      password: "NouveauMdp-456!",
    });

    expect(loginResponse.status).toBe(200);
  });

  it("rejects reusing the same token twice", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const { rawToken } = await requestReset(validSignupPayload.email);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "NouveauMdp-456!" });

    const secondAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "AutreMdp-789!xyz" });

    expect(secondAttempt.status).toBe(400);
  });
});

describe("Email confirmation (double opt-in)", () => {
  let fakeResend;

  beforeEach(() => {
    fakeResend = { emails: { send: vi.fn().mockResolvedValue({}) } };
    getResendClient.mockReturnValue(fakeResend);
  });

  function extractTokenFromLastEmail() {
    const { html } = fakeResend.emails.send.mock.calls.at(-1)[0];
    return html.match(/token=([a-f0-9]+)/)[1];
  }

  it("sends a confirmation link at signup and starts unconfirmed", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);

    expect(response.body.user.emailVerified).toBe(false);
    expect(fakeResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: validSignupPayload.email,
        subject: "Confirme ton adresse e-mail Antunes",
      }),
    );
  });

  it("confirms the address with the token received by email", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);
    const token = extractTokenFromLastEmail();

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ token });

    expect(response.status).toBe(200);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signupResponse.body.token}`);
    expect(meResponse.body.user.emailVerified).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "not-a-real-token" });

    expect(response.status).toBe(400);
  });

  it("does not accept the same token twice", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const token = extractTokenFromLastEmail();

    await request(app).post("/api/auth/verify-email").send({ token });
    const secondAttempt = await request(app)
      .post("/api/auth/verify-email")
      .send({ token });

    expect(secondAttempt.status).toBe(400);
  });

  it("stores only a hash of the token, never the token itself", async () => {
    await request(app).post("/api/auth/signup").send(validSignupPayload);
    const token = extractTokenFromLastEmail();

    const user = await User.findOne({ email: validSignupPayload.email }).select(
      "+emailVerificationTokenHash",
    );

    expect(user.emailVerificationTokenHash).not.toBe(token);
    expect(user.emailVerificationTokenHash).toBe(User.hashToken(token));
  });

  it("can resend a new link to an unconfirmed account", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);

    const response = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", `Bearer ${signupResponse.body.token}`);

    expect(response.status).toBe(200);
    expect(fakeResend.emails.send).toHaveBeenCalledTimes(2);
  });

  it("refuses to resend a link once the address is confirmed", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);
    await request(app)
      .post("/api/auth/verify-email")
      .send({ token: extractTokenFromLastEmail() });

    const response = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", `Bearer ${signupResponse.body.token}`);

    expect(response.status).toBe(400);
  });

  it("still creates the account when the email provider is down", async () => {
    fakeResend.emails.send.mockRejectedValue(new Error("Resend unavailable"));

    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignupPayload);

    expect(response.status).toBe(201);
  });
});
