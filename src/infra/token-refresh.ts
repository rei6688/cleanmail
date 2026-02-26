import { updateTokens } from "@/repositories/oauth-accounts";
import type { IOAuthAccount } from "@/types";
import type { Types } from "mongoose";

const TOKEN_REFRESH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const BUFFER_SECONDS = 300; // refresh 5 min before expiry

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Returns a valid access token, refreshing if needed.
 * Persists updated tokens to the database.
 */
export async function getValidToken(
  account: IOAuthAccount,
  userId: Types.ObjectId | string
): Promise<TokenResult> {
  const now = new Date();
  const bufferMs = BUFFER_SECONDS * 1000;

  if (account.expiresAt.getTime() - now.getTime() > bufferMs) {
    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt: account.expiresAt,
    };
  }

  return refreshAccessToken(account.refreshToken, userId);
}

/**
 * Forces a token refresh using the stored refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  userId: Types.ObjectId | string
): Promise<TokenResult> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Microsoft OAuth credentials");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope:
      "openid email profile offline_access Mail.ReadWrite MailboxSettings.Read",
  });

  const response = await fetch(TOKEN_REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const newRefreshToken = data.refresh_token ?? refreshToken;

  await updateTokens(userId, {
    accessToken: data.access_token,
    refreshToken: newRefreshToken,
    expiresAt,
  });

  return {
    accessToken: data.access_token,
    refreshToken: newRefreshToken,
    expiresAt,
  };
}
