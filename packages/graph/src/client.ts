// packages/graph/src/client.ts
// Instagram Graph API v21.0 typed client
// META-VERIFIED: Graph version v21.0 current; base URL = https://graph.instagram.com/
// META-VERIFIED: Scopes required: instagram_business_basic, instagram_business_manage_comments,
//   instagram_business_manage_messages (deprecated legacy names Jan 27 2025)
import axios, { type AxiosInstance, type AxiosError } from 'axios';

export const GRAPH_VERSION = process.env['GRAPH_VERSION'] ?? 'v21.0';
export const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

export interface GraphError {
  error: {
    message: string;
    type: string;
    code: number;           // 80002 = Business Use Case throttle
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export function isGraphError(e: unknown): e is AxiosError<GraphError> {
  return axios.isAxiosError(e) && !!(e.response?.data as GraphError | undefined)?.error;
}

export function getGraphErrorCode(e: unknown): number | null {
  if (isGraphError(e)) {
    return (e.response?.data as GraphError).error.code;
  }
  return null;
}

/** Create an axios instance pre-configured for the Instagram Graph API */
export function createGraphClient(accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: GRAPH_BASE,
    params: { access_token: accessToken },
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Interface for the Graph client (allows easy mocking in tests) */
export interface IGraphClient {
  sendPrivateReply(igId: string, commentId: string, message: PrivateReplyPayload): Promise<{ message_id: string }>;
  sendButtonTemplate(igId: string, recipientId: string, payload: ButtonTemplatePayload): Promise<{ message_id: string }>;
  sendWebUrlButton(igId: string, recipientId: string, payload: WebUrlButtonPayload): Promise<{ message_id: string }>;
  replyToComment(commentId: string, text: string): Promise<{ id: string }>;
  listMedia(igId: string, fields: string, limit: number): Promise<{ data: MediaItem[]; paging?: { cursors: { after: string }; next?: string } }>;
  listComments(mediaId: string, fields: string, order: string, after?: string): Promise<{ data: CommentItem[]; paging?: { cursors: { after: string }; next?: string } }>;
  refreshToken(token: string): Promise<{ access_token: string; token_type: string; expires_in: number }>;
  getMe(fields: string): Promise<{ id: string; username: string; account_type: string }>;
  subscribeWebhook(igId: string, fields: string[]): Promise<{ success: boolean }>;
}

export interface PrivateReplyPayload {
  recipient: { comment_id: string };
  message: { text: string } | ButtonTemplatePayload['message'];
}

export interface ButtonTemplatePayload {
  recipient: { id: string };
  message: {
    attachment: {
      type: 'template';
      payload: {
        template_type: 'button';
        text: string;
        buttons: Array<PostbackButton | WebUrlButton>;
      };
    };
  };
}

export interface WebUrlButtonPayload {
  recipient: { id: string };
  message: {
    attachment: {
      type: 'template';
      payload: {
        template_type: 'button';
        text: string;
        buttons: [WebUrlButton];
      };
    };
  };
}

export interface PostbackButton {
  type: 'postback';
  title: string;
  payload: string;
}

export interface WebUrlButton {
  type: 'web_url';
  title: string;
  url: string;
}

export interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
}

export interface CommentItem {
  id: string;
  text: string;
  from?: { id: string; username?: string };
  timestamp: string;
  parent_id?: string;
}
