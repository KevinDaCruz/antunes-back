import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../config/email.js", () => ({
  getResendClient: vi.fn(),
}));

const { getResendClient } = await import("../config/email.js");
const { createApp } = await import("../app.js");
const { PrivacyRequest } = await import("../models/PrivacyRequest.js");

const app = createApp();

const validRequest = {
  email: "Client@Example.com",
  type: "access",
  message: "Je souhaite connaître les données que vous détenez sur moi.",
};

describe("POST /api/privacy-requests", () => {
  afterEach(() => {
    delete process.env.PRIVACY_CONTACT_EMAIL;
  });

  it("records the request without requiring an account", async () => {
    const response = await request(app)
      .post("/api/privacy-requests")
      .send(validRequest);

    expect(response.status).toBe(201);
    expect(response.body.reference).toBeTruthy();

    const saved = await PrivacyRequest.findById(response.body.reference);
    expect(saved.email).toBe("client@example.com");
    expect(saved.status).toBe("received");
  });

  it("notifies the data controller by email when a contact is configured", async () => {
    process.env.PRIVACY_CONTACT_EMAIL = "dpo@antunes.test";
    const fakeResend = { emails: { send: vi.fn().mockResolvedValue({}) } };
    getResendClient.mockReturnValue(fakeResend);

    await request(app).post("/api/privacy-requests").send(validRequest);

    expect(fakeResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dpo@antunes.test",
        subject: "Nouvelle demande RGPD : Droit d'accès",
      }),
    );
  });

  it("escapes HTML typed by the user in the notification", async () => {
    process.env.PRIVACY_CONTACT_EMAIL = "dpo@antunes.test";
    const fakeResend = { emails: { send: vi.fn().mockResolvedValue({}) } };
    getResendClient.mockReturnValue(fakeResend);

    await request(app)
      .post("/api/privacy-requests")
      .send({ ...validRequest, message: "<script>alert(1)</script>" });

    const { html } = fakeResend.emails.send.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rejects an unknown request type", async () => {
    const response = await request(app)
      .post("/api/privacy-requests")
      .send({ ...validRequest, type: "everything" });

    expect(response.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/privacy-requests")
      .send({ ...validRequest, email: "not-an-email" });

    expect(response.status).toBe(400);
  });
});
