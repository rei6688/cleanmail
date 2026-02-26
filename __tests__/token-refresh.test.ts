import { getValidToken, refreshAccessToken } from "../src/infra/token-refresh";
import type { IOAuthAccount } from "../src/types";
import type { Types } from "mongoose";

// Mock the repository
jest.mock("../src/repositories/oauth-accounts", () => ({
  updateTokens: jest.fn().mockResolvedValue(undefined),
}));

const mockUpdateTokens = jest.requireMock("../src/repositories/oauth-accounts").updateTokens;

function makeAccount(overrides: Partial<IOAuthAccount> = {}): IOAuthAccount {
  return {
    _id: "acc1" as unknown as Types.ObjectId,
    userId: "user1" as unknown as Types.ObjectId,
    provider: "microsoft",
    accessToken: "valid-access-token",
    refreshToken: "valid-refresh-token",
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    scope: "openid email",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getValidToken", () => {
  it("returns existing token when not near expiry", async () => {
    const account = makeAccount();
    const result = await getValidToken(account, "user1");
    expect(result.accessToken).toBe("valid-access-token");
    expect(mockUpdateTokens).not.toHaveBeenCalled();
  });

  it("calls refreshAccessToken when token is near expiry", async () => {
    // Expired 10 seconds ago
    const account = makeAccount({
      expiresAt: new Date(Date.now() - 10_000),
    });

    // Mock fetch for token refresh
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    process.env.MICROSOFT_CLIENT_ID = "test-client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret";

    const result = await getValidToken(account, "user1");
    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBe("new-refresh-token");
    expect(mockUpdateTokens).toHaveBeenCalledWith("user1", {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: expect.any(Date),
    });
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MICROSOFT_CLIENT_ID = "test-client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret";
  });

  it("throws when fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    });

    await expect(
      refreshAccessToken("bad-refresh-token", "user1")
    ).rejects.toThrow("Token refresh failed: 400");
  });

  it("succeeds and persists tokens", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "fresh-token",
        refresh_token: "fresh-refresh",
        expires_in: 7200,
      }),
    });

    const result = await refreshAccessToken("old-refresh-token", "user1");
    expect(result.accessToken).toBe("fresh-token");
    expect(result.refreshToken).toBe("fresh-refresh");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mockUpdateTokens).toHaveBeenCalledTimes(1);
  });

  it("falls back to existing refresh token when none returned", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "token",
        expires_in: 3600,
        // no refresh_token in response
      }),
    });

    const result = await refreshAccessToken("original-refresh", "user1");
    expect(result.refreshToken).toBe("original-refresh");
  });

  it("throws when credentials are missing", async () => {
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;

    await expect(
      refreshAccessToken("token", "user1")
    ).rejects.toThrow("Missing Microsoft OAuth credentials");
  });
});
