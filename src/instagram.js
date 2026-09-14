const axios = require('axios');

const GRAPH_VERSION = 'v21.0';
const BASE_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;
const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ID;

/**
 * STEP 2: Reply privately to a comment. Text only - no buttons/images allowed
 * on this specific endpoint. Must happen within 7 days of the comment.
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/private-replies
 */
async function sendPrivateReply(commentId, text) {
  const url = `${BASE_URL}/${IG_ID}/messages`;
  const res = await axios.post(
    url,
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
    { params: { access_token: ACCESS_TOKEN } }
  );
  return res.data; // { recipient_id, message_id }
}

/**
 * STEP 3: Send a button template with a single postback button.
 * This is a normal DM (not a comment reply), so buttons are allowed.
 * Docs: https://developers.facebook.com/docs/messenger-platform/send-messages/template/button
 */
async function sendGetLinkButton(recipientId) {
  const url = `${BASE_URL}/${IG_ID}/messages`;
  return axios.post(
    url,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'Ready when you are 👇',
            buttons: [
              {
                type: 'postback',
                title: 'Get Link',
                payload: 'GET_LINK',
              },
            ],
          },
        },
      },
    },
    { params: { access_token: ACCESS_TOKEN } }
  );
}

/**
 * STEP 5: Send the final message with a web_url button that redirects
 * straight to the destination link when tapped.
 */
async function sendFinalLinkButton(recipientId, destinationUrl) {
  const url = `${BASE_URL}/${IG_ID}/messages`;
  return axios.post(
    url,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: "Here's your requested link 👇",
            buttons: [
              {
                type: 'web_url',
                title: 'Open Link',
                url: destinationUrl,
              },
            ],
          },
        },
      },
    },
    { params: { access_token: ACCESS_TOKEN } }
  );
}

module.exports = {
  sendPrivateReply,
  sendGetLinkButton,
  sendFinalLinkButton,
};