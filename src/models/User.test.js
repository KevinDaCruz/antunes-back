import { describe, expect, it } from "vitest";
import { User } from "./User.js";

describe("User model", () => {
  it("hashes a password and can later verify it", async () => {
    const passwordHash = await User.hashPassword("azerty123");
    const user = await User.create({
      pseudo: "kevintech",
      email: "kevin@example.com",
      passwordHash,
    });

    expect(await user.comparePassword("azerty123")).toBe(true);
    expect(await user.comparePassword("wrong-password")).toBe(false);
  });

  it("rejects two users with the same pseudo", async () => {
    const passwordHash = await User.hashPassword("azerty123");
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
