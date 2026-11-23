import { describe, expect, it } from "vitest";
import { findConfigProblems } from "./env.js";

const PRODUCTION_ENV = {
  NODE_ENV: "production",
  MONGO_URI: "mongodb+srv://cluster.example/antunes",
  JWT_SECRET: "a".repeat(48),
  CORS_ORIGIN: "https://antunes.example",
  FRONTEND_URL: "https://antunes.example",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  RESEND_API_KEY: "re_x",
};

describe("findConfigProblems", () => {
  it("accepts a complete production configuration", () => {
    expect(findConfigProblems(PRODUCTION_ENV)).toEqual([]);
  });

  it("lists every missing or weak production setting without their values", () => {
    const problems = findConfigProblems({
      ...PRODUCTION_ENV,
      JWT_SECRET: "court",
      CORS_ORIGIN: undefined,
    });

    expect(problems).toHaveLength(2);
    expect(problems.join(" ")).toContain("JWT_SECRET");
    expect(problems.join(" ")).toContain("CORS_ORIGIN");
    expect(problems.join(" ")).not.toContain("court");
  });

  it("only requires the database and the JWT secret in development", () => {
    expect(
      findConfigProblems({
        NODE_ENV: "development",
        MONGO_URI: "mongodb://localhost:27018/antunes",
        JWT_SECRET: "dev",
      }),
    ).toEqual([]);
  });
});
