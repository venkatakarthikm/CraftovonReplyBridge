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

  /** Fetch insights for a specific Media item with progressive degradation */
  async getMediaInsights(mediaId: string, mediaProductType?: string): Promise<Record<string, number> | { _error: true; code?: number; message?: string; fbtrace_id?: string }> {
    // 1. Determine primary metric set based on media_product_type
    const product = mediaProductType?.toUpperCase() || 'FEED';
    let primaryMetrics = 'comments,likes,views,reach,saved,shares,total_interactions,impressions';
    if (product === 'REELS' || product === 'REEL') {
      primaryMetrics = 'comments,likes,views,reach,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time';
    } else if (product === 'STORY') {
      primaryMetrics = 'views,reach,shares,total_interactions,impressions';
    }

    const fallbackMetrics = 'views,likes,comments,reach';

    try {
      // Attempt 1: Full primary set
      const res = await this.client.get<{ data: { name: string; values: { value: number }[] }[] }>(
        `/${mediaId}/insights`,
        { params: { metric: primaryMetrics } }
      );
      return this.parseInsights(res.data.data);
    } catch (e1: any) {
      const err1 = e1.response?.data?.error || e1;
      console.warn(`Primary insights fetch failed for ${mediaId} (${product}):`, err1.message || err1);

      try {
        // Attempt 2: Minimal fallback set
        const res2 = await this.client.get<{ data: { name: string; values: { value: number }[] }[] }>(
          `/${mediaId}/insights`,
          { params: { metric: fallbackMetrics } }
        );
        return this.parseInsights(res2.data.data);
      } catch (e2: any) {
        const err2 = e2.response?.data?.error || e2;
        console.error(`Fallback insights fetch failed for ${mediaId}:`, err2.message || err2);
        
        // Return explicit error object instead of silent {}
        return {
          _error: true,
          code: err2.code,
          message: err2.message,
          fbtrace_id: err2.fbtrace_id,
        };
      }
    }
  }

  private parseInsights(data: { name: string; values: { value: number }[] }[]): Record<string, number> {
    const insights: Record<string, number> = {};
    for (const item of data) {
      if (item.values && item.values.length > 0 && typeof item.values[0]?.value === 'number') {
        insights[item.name] = item.values[0]?.value;
      }
    }
    return insights;
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
  async subscribeWebhook(igId: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(
      `/${igId}/subscribed_apps`,
      null, // no JSON body
      {
        params: {
          subscribed_fields: ['comments', 'messages', 'messaging_postbacks'].join(','),
        },
      }
    );
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
    user_id: string;
    username: string;
    account_type: string;
  }>(`${GRAPH_BASE}/me`, {
    params: {
      fields: 'user_id,username,account_type',
      access_token: longLivedRes.data.access_token,
    },
  });

  return {
    longLivedToken: longLivedRes.data.access_token,
    expiresIn: longLivedRes.data.expires_in,
    igId: profileRes.data.user_id,
    username: profileRes.data.username,
    accountType: profileRes.data.account_type,
  };
}

export function mapMediaType(item: { media_product_type?: string; media_type?: string }): 'REEL' | 'POST' | 'CAROUSEL' | 'STORY' | 'LIVE' {
  const product = item.media_product_type?.toUpperCase();
  if (product === 'REELS') return 'REEL';
  if (product === 'STORY') return 'STORY';
  if (product === 'AD' || product === 'FEED') return 'POST';

  const t = item.media_type?.toUpperCase();
  if (t === 'VIDEO') return 'REEL';
  if (t === 'CAROUSEL_ALBUM') return 'CAROUSEL';

  return 'POST';
}
