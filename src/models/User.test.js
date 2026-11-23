import { describe, expect, it } from "vitest";
import { User } from "./User.js";

describe("User model", () => {
  it("hashes a password and can later verify it", async () => {
    const passwordHash = await User.hashPassword("Azerty-2026!x");
    const user = await User.create({
      pseudo: "kevintech",
      email: "kevin@example.com",
      passwordHash,
    });

    expect(await user.comparePassword("Azerty-2026!x")).toBe(true);
    expect(await user.comparePassword("wrong-password")).toBe(false);
  });

  it("rejects two users with the same pseudo", async () => {
    const passwordHash = await User.hashPassword("Azerty-2026!x");
    await User.create({
      pseudo: "kevintech",
      email: "kevin@example.com",
      passwordHash,
    });

    await expect(
      User.create({
        pseudo: "kevintech",
        email: "other@example.com",
        passwordHash,
      }),
    ).rejects.toThrow();
  });
});
