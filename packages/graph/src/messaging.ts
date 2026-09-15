// packages/graph/src/messaging.ts
// Instagram Messaging API calls
// META-VERIFIED: Private reply endpoint: POST /{igId}/messages
//   recipient: { comment_id } for private replies to comments
//   Further messages only after inbound message opens 24h window
// META-VERIFIED: Rate limit = 100 calls/sec text/link per IG professional account
//   Throttle error code = 80002
import { createGraphClient, type IGraphClient, type PrivateReplyPayload, type ButtonTemplatePayload, type WebUrlButtonPayload } from './client.js';

const BUTTON_MODE = process.env['PRIVATE_REPLY_BUTTON_MODE'] ?? 'attempt';

/**
 * Real implementation of IGraphClient for messaging.
 * Decrypted token is passed in — decryption only happens inside workers.
 */
export class RealGraphMessagingClient {
  private client;

  constructor(private readonly accessToken: string, private readonly igId: string) {
    this.client = createGraphClient(accessToken);
  }

  /**
   * Send a private reply to a comment.
   * Strategy: if PRIVATE_REPLY_BUTTON_MODE=attempt, try button template first,
   * fall back to plain text on failure (docs describe private replies as text-only,
   * but the legacy bot confirmed button templates sometimes work).
   * META-VERIFIED: recipient.comment_id routes to private reply endpoint
   */
  async sendPrivateReply(
    commentId: string,
    text: string,
    buttonTitle = 'Get Link',
    buttonPayload = 'GET_LINK'
  ): Promise<{ message_id: string; usedFallback: boolean }> {
    if (BUTTON_MODE === 'attempt') {
      try {
        const res = await this.client.post<{ message_id: string }>(
          `/${this.igId}/messages`,
          {
            recipient: { comment_id: commentId },
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text,
                  buttons: [{ type: 'postback', title: buttonTitle, payload: buttonPayload }],
                },
              },
            },
          }
        );
        return { message_id: res.data.message_id, usedFallback: false };
      } catch {
        // Fall through to plain text
      }
    }

    // Plain text fallback (guaranteed delivery)
    const res = await this.client.post<{ message_id: string }>(`/${this.igId}/messages`, {
      recipient: { comment_id: commentId },
      message: { text },
    });
    return { message_id: res.data.message_id, usedFallback: true };
  }

  /** Send "Get Link" postback button as a follow-up DM (requires open 24h window) */
  async sendGetLinkButton(
    participantId: string,
    promptText: string,
    buttonTitle = 'Get Link',
    buttonPayload = 'GET_LINK'
  ): Promise<{ message_id: string }> {
    const payload: ButtonTemplatePayload = {
      recipient: { id: participantId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: promptText,
            buttons: [{ type: 'postback', title: buttonTitle, payload: buttonPayload }],
          },
        },
      },
    };
    const res = await this.client.post<{ message_id: string }>(`/${this.igId}/messages`, payload);
    return res.data;
  }

  /** Send the final web_url button with the per-reel dynamic link */
  async sendLinkButton(
    participantId: string,
    text: string,
    linkUrl: string,
    linkTitle = 'Open Link'
  ): Promise<{ message_id: string }> {
    const payload: WebUrlButtonPayload = {
      recipient: { id: participantId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text,
            buttons: [{ type: 'web_url', title: linkTitle, url: linkUrl }],
          },
        },
      },
    };
    const res = await this.client.post<{ message_id: string }>(`/${this.igId}/messages`, payload);
    return res.data;
  }
}
