// packages/graph/src/comments.ts
// Instagram Comments API calls
// META-VERIFIED: Public reply endpoint: POST /{commentId}/replies
import { createGraphClient, type CommentItem } from './client.js';

export class GraphCommentsClient {
  private client;

  constructor(accessToken: string) {
    this.client = createGraphClient(accessToken);
  }

  /** Public reply under a comment (the optional "check your DMs" nudge) */
  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    const res = await this.client.post<{ id: string }>(`/${commentId}/replies`, {
      message,
    });
    return res.data;
  }

  /**
   * List comments on a media item (for backfill).
   * Uses reverse_chronological order + cursor pagination.
   */
  async listComments(
    mediaId: string,
    after?: string
  ): Promise<{
    data: CommentItem[];
    paging?: { cursors: { after: string }; next?: string };
  }> {
    const params: Record<string, string> = {
      fields: 'id,text,from,timestamp,parent_id',
      order: 'reverse_chronological',
    };
    if (after) params['after'] = after;

    const res = await this.client.get<{
      data: CommentItem[];
      paging?: { cursors: { after: string }; next?: string };
    }>(`/${mediaId}/comments`, { params });
    return res.data;
  }
}
