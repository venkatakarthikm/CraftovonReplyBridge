# 08 — Privacy Policy (production copy — render at `/privacy-policy`, public, no login)

> Meta App Review requires a publicly accessible, complete privacy policy at a real URL. Serve this page from the SaaS domain itself (not a PDF).

**Privacy Policy — Replivault**
Last updated: 2026-09-14

Replivault ("we", "us") is a service that automates Instagram comment replies and direct messages on behalf of businesses and creators ("Customers"). This policy covers data we process when you use our website and when you interact with a Customer's Instagram account that uses Replivault.

## 1. Information we process
- **Customer account data:** name, email, password (hashed), billing details processed by our payment provider (we never store card numbers).
- **Instagram account data (Customers):** Instagram professional account ID and username, the long-lived access token you grant via Meta's official login (stored encrypted; used solely to call the Instagram API on your behalf), your reels/posts metadata (ID, caption, thumbnail, timestamp) and comments on them.
- **End-user data (people who comment or DM a Customer's account):** Instagram user ID, username, comment text, and the message events needed to deliver the automated reply.

## 2. How we use information
- To deliver the automation a Customer configured: detect comments, send private replies and messages containing the Customer's chosen link.
- To show Customers analytics (counts of comments, messages, link taps).
- To secure accounts, prevent abuse, and comply with law.
We do not sell personal data, do not share it with third parties for their own use, and do not use it for advertising or for AI/ML model training.

## 3. Legal bases (GDPR)
Performance of contract (delivering the service), legitimate interests (security, abuse prevention), consent (Instagram OAuth permissions), legal obligation (billing records).

## 4. Retention
Comment and message logs: 180 days, then automatically deleted. Raw webhook payloads: 7 days. Conversation state: 24 hours. Access tokens: only while your account is connected; deleted immediately on disconnect or when Meta notifies us of revocation. Account data: deleted within 30 days of a deletion request (backup purge within 90 days).

## 5. Your rights
Access, export, correction, deletion, objection. Self-serve export and deletion in Settings → Privacy; requests are honored within 30 days (EU GDPR / India DPDP Act). Contact: **privacy@replivault.com** (update to your real address).

## 6. Data deletion callback (Meta requirement)
Meta may send user-data-deletion requests to our Data Deletion Request Callback URL; we process them within 48 hours and confirm completion. Public status page: `/data-deletion`.

## 7. Security
Encryption in transit (TLS 1.2+) and at rest; Instagram tokens encrypted with AES-256-GCM; strict access controls; audit logging.

## 8. Subprocessors
Cloud hosting, MongoDB Atlas (database), Redis provider, payment processor, transactional email. Current list available on request.

## 9. Children
The service is not directed to children under 13 (or under 18 in the EEA without consent), and we do not knowingly process their data.

## 10. Changes
Material changes will be announced by email and in-app 14 days before taking effect.
