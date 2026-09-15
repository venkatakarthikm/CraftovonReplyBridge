// packages/graph/src/media.ts
// Instagram Media API + token refresh
import { createGraphClient, GRAPH_BASE, type MediaItem } from './client.js';
import axios from 'axios';

export class GraphMediaClient {
  private client;

  constructor(private readonly accessToken: string) {
    this.client = createGraphClient(accessToken);
  }

  /**
   * List the last N media items for an IG account.
   * Paginated — call repeatedly until no `next` cursor.
   * Backfill imports up to last 100 items.
   */
  async listMedia(
    igId: string,
    after?: string,
    limit = 25
  ): Promise<{
    data: MediaItem[];
    paging?: { cursors: { after: string }; next?: string };
  }> {
    const params: Record<string, string | number> = {
      fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp',
      limit,
    };
    if (after) params['after'] = after;

    const res = await this.client.get<{
      data: MediaItem[];
      paging?: { cursors: { after: string }; next?: string };
    }>(`/${igId}/media`, { params });
    return res.data;
  }

  /** Get IG account profile (id, username, account_type) */
  async getMe(): Promise<{ id: string; username: string; account_type: string }> {
    const res = await this.client.get<{ id: string; username: string; account_type: string }>(
      '/me',
      { params: { fields: 'id,username,account_type' } }
    );
    return res.data;
  }

  /**
   * Refresh a long-lived token.
   * META-VERIFIED: grant_type=ig_refresh_token; token must be ≥24h old.
   * Endpoint: GET /refresh_access_token (not /access_token)
   */
  static async refreshToken(
    expiredToken: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const res = await axios.get<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(`${GRAPH_BASE}/refresh_access_token`, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: expiredToken,
      },
    });
    return res.data;
  }

  /**
   * Subscribe to webhook fields for an IG account.
   * META-VERIFIED: Fields for comment automation: comments, messages, messaging_postbacks, message_echoes
   */
  async subscribeWebhook(igId: string, appId: string, appSecret: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(`/${igId}/subscribed_apps`, {
      subscribed_fields: ['comments', 'messages', 'messaging_postbacks', 'message_echoes'],
    });
    return res.data;
  }
}

/**
 * Exchange auth code for short-lived token, then long-lived token.
 * META-VERIFIED: Two-step exchange for Instagram Login path:
 *   1. api.instagram.com/oauth/access_token (code → short-lived)
 *   2. graph.instagram.com/v21.0/access_token (short-lived → long-lived, grant_type=ig_exchange_token)
 */
export async function exchangeCodeForTokens(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<{
  longLivedToken: string;
  expiresIn: number;  // seconds (~5184000 = 60 days)
  igId: string;
  username: string;
  accountType: string;
}> {
  // Step 1: code → short-lived token
  const shortLivedRes = await axios.post<{
    access_token: string;
    user_id: number;
  }>(
    'https://api.instagram.com/oauth/access_token',
    new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  const shortLivedToken = shortLivedRes.data.access_token;

  // Step 2: short-lived → long-lived
  const longLivedRes = await axios.get<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>(`${GRAPH_BASE}/access_token`, {
    params: {
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortLivedToken,
    },
  });

  // Step 3: get IG profile
  const profileRes = await axios.get<{
    id: string;
    username: string;
    account_type: string;
  }>(`${GRAPH_BASE}/me`, {
    params: {
      fields: 'id,username,account_type',
      access_token: longLivedRes.data.access_token,
    },
  });

  return {
    longLivedToken: longLivedRes.data.access_token,
    expiresIn: longLivedRes.data.expires_in,
    igId: profileRes.data.id,
    username: profileRes.data.username,
    accountType: profileRes.data.account_type,
  };
}
