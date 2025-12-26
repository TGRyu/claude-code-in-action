import { describe, test, expect, vi, beforeEach } from "vitest";
import { createSession } from "@/lib/auth";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

describe("createSession", () => {
  let mockCookieStore: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockSignJWT: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

    mockSignJWT = {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue("mocked-jwt-token"),
    };

    const { SignJWT } = await import("jose");
    vi.mocked(SignJWT).mockImplementation(() => mockSignJWT);
  });

  test("creates a JWT token with correct payload", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const { SignJWT } = await import("jose");
    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
        expiresAt: expect.any(Date),
      })
    );
  });

  test("sets JWT with correct header and expiration", async () => {
    await createSession("user123", "test@example.com");

    expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({
      alg: "HS256",
    });
    expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith("7d");
    expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
    expect(mockSignJWT.sign).toHaveBeenCalled();
  });

  test("sets cookie with correct options", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    await createSession("user123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mocked-jwt-token",
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        expires: expect.any(Date),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  test("sets secure cookie in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await createSession("user123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mocked-jwt-token",
      expect.objectContaining({
        secure: true,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  test("sets cookie expiration to 7 days from now", async () => {
    const beforeTime = Date.now();
    await createSession("user123", "test@example.com");
    const afterTime = Date.now();

    const callArgs = mockCookieStore.set.mock.calls[0];
    const cookieOptions = callArgs[2];
    const expiresAt = cookieOptions.expires as Date;

    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expectedMinTime = beforeTime + sevenDaysInMs;
    const expectedMaxTime = afterTime + sevenDaysInMs;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinTime);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime);
  });

  test("creates session with different user credentials", async () => {
    const userId = "admin456";
    const email = "admin@example.com";

    await createSession(userId, email);

    const { SignJWT } = await import("jose");
    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin456",
        email: "admin@example.com",
      })
    );
  });
});
