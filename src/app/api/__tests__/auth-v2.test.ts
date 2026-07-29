import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";
import { generateOTP, hashOTP, verifyOTP } from "@/lib/otp";

describe("Auth V2 Security Utilities", () => {
  it("hashes and verifies passwords using bcrypt", async () => {
    const raw = "SuperSecret123!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("validates password strength rules", () => {
    expect(validatePasswordStrength("short")).toContain("at least 8 characters");
    expect(validatePasswordStrength("alllowercase123")).toContain("uppercase");
    expect(validatePasswordStrength("ALLUPPERCASE123")).toContain("lowercase");
    expect(validatePasswordStrength("NoNumbersHere")).toContain("number");
    expect(validatePasswordStrength("ValidPassword123")).toBe(null);
  });

  it("generates 6-digit OTPs and verifies hashes", () => {
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);

    const hash = hashOTP(otp);
    expect(verifyOTP(otp, hash)).toBe(true);
    expect(verifyOTP("000000", hash)).toBe(false);
  });
});
