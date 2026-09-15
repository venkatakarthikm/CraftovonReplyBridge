// packages/db/src/seed.ts
// Seed script: plans + 10 system templates + help articles
// Run: npm run seed (from repo root) or tsx packages/db/src/seed.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { PlanModel } from './models/plan.model.js';
import { TemplateModel } from './models/template.model.js';
import { HelpArticleModel } from './models/helpArticle.model.js';

const MONGO_URI = process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/replybridge';

// ─── Plans ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'free',
    priceMonthly: 0,
    igAccountsLimit: 1,
    mediaLimit: 10,
    dmQuotaPerMonth: 500,
    automationLimit: 3,
    features: ['1 Instagram account', '10 reels', '500 DMs/month', '3 automations'],
  },
  {
    key: 'starter',
    priceMonthly: 1900, // $19
    igAccountsLimit: 2,
    mediaLimit: 50,
    dmQuotaPerMonth: 5000,
    automationLimit: 20,
    features: [
      '2 Instagram accounts',
      '50 reels',
      '5,000 DMs/month',
      '20 automations',
      'Analytics',
      'CSV export',
    ],
  },
  {
    key: 'pro',
    priceMonthly: 4900, // $49
    igAccountsLimit: 5,
    mediaLimit: 200,
    dmQuotaPerMonth: 25000,
    automationLimit: 100,
    features: [
      '5 Instagram accounts',
      '200 reels',
      '25,000 DMs/month',
      'Unlimited automations',
      'Priority support',
      'Team members',
      'API access',
    ],
  },
  {
    key: 'agency',
    priceMonthly: 14900, // $149
    igAccountsLimit: 25,
    mediaLimit: 999999,
    dmQuotaPerMonth: 200000,
    automationLimit: 999999,
    features: [
      '25 Instagram accounts',
      'Unlimited reels',
      '200,000 DMs/month',
      'Unlimited automations',
      'Dedicated support',
      'White-label options',
      'Custom integrations',
    ],
  },
];

// ─── System Templates (doc 07 §Templates T1) ─────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    kind: 'private_reply' as const,
    name: 'Link Drop',
    body: 'Hey {{name}}! 👋 Thanks for commenting. Here\'s the link you asked for 👇',
    isSystem: true,
  },
  {
    kind: 'private_reply' as const,
    name: 'Soft Ask',
    body: "Hi {{name}}, saw your comment on '{{reel_caption_first_line}}' — want the link? Just reply YES and it's yours!",
    isSystem: true,
  },
  {
    kind: 'private_reply' as const,
    name: 'Support Tone',
    body: 'Hey {{name}}! Thanks for reaching out — tap below and we\'ll take care of you.',
    isSystem: true,
  },
  {
    kind: 'private_reply' as const,
    name: 'Urgency',
    body: '{{name}}, your link is ready ⏳ tap Get Link before it expires!',
    isSystem: true,
  },
  {
    kind: 'private_reply' as const,
    name: 'Friendly Intro',
    body: 'Hey {{name}}! 🎉 Thanks for your comment. I\'ve got something special for you — check your DMs!',
    isSystem: true,
  },
  {
    kind: 'private_reply' as const,
    name: 'Value Tease',
    body: 'Hi @{{username}}! You asked about the link from my reel — it\'s right here. Just tap Get Link below! 🔗',
    isSystem: true,
  },
  {
    kind: 'comment_reply' as const,
    name: 'Public Nudge',
    body: '📩 Check your DMs — sent you the link!',
    isSystem: true,
  },
  {
    kind: 'comment_reply' as const,
    name: 'DM Prompt',
    body: '✉️ Just sent you a DM with everything you need, {{name}}!',
    isSystem: true,
  },
  {
    kind: 'dm_reply' as const,
    name: 'Follow-up',
    body: 'Still here! Tap the button below to get your link 👇',
    isSystem: true,
  },
  {
    kind: 'dm_reply' as const,
    name: 'DM Welcome',
    body: 'Hey {{name}}! Thanks for reaching out. Here\'s what you\'re looking for 👇',
    isSystem: true,
  },
];

// ─── Help Articles (doc 07) ──────────────────────────────────────────────────
const HELP_ARTICLES = [
  {
    slug: 'connect-instagram',
    title: 'Connect your Instagram account (5 min)',
    category: 'Getting started',
    order: 1,
    bodyHtml: `
      <h2>Requirements</h2>
      <p>You need an Instagram <strong>Professional</strong> account (Business or Creator).</p>
      <h2>Steps</h2>
      <ol>
        <li>Go to <strong>Settings → Connections</strong> in the Craftovon dashboard.</li>
        <li>Click <strong>Connect Instagram</strong>.</li>
        <li>You'll be redirected to Meta's consent screen.</li>
        <li>Approve the three permissions:
          <ul>
            <li><em>Basic profile access</em> — lets us show your account name and reels</li>
            <li><em>Read &amp; reply to comments</em> — lets us send private replies and public comment responses</li>
            <li><em>Send messages</em> — lets us send DMs after a commenter replies to your private message</li>
          </ul>
        </li>
        <li>Your last 100 reels import automatically — this takes about 30 seconds.</li>
      </ol>
      <p>After connecting, you'll land on the Reels page where your content appears.</p>
    `,
  },
  {
    slug: 'first-automation',
    title: 'Set up your first reel automation',
    category: 'Getting started',
    order: 2,
    bodyHtml: `
      <h2>The 3-question wizard</h2>
      <p>Pick any reel from your Reels page, click <strong>Automate</strong>, and answer three questions:</p>
      <ol>
        <li><strong>Trigger:</strong> "Any comment" sends a DM to everyone who comments. "Specific words" only triggers for comments containing your keywords (e.g. <em>link, price, dm</em>).</li>
        <li><strong>Private reply text:</strong> What you want to DM them first. Use {{name}} to personalize.</li>
        <li><strong>Link to send:</strong> The URL that gets delivered after they tap "Get Link".</li>
      </ol>
      <p>Click <strong>Activate</strong> — your automation is live!</p>
      <h2>What happens next</h2>
      <p>Someone comments → they get your DM instantly → if they reply, they get a "Get Link" button → they tap it → they get your link. Simple.</p>
      <p>Test it with a second account to see it in action.</p>
    `,
  },
  {
    slug: 'different-links-per-reel',
    title: 'Sending different links on different reels',
    category: 'Getting started',
    order: 3,
    bodyHtml: `
      <h2>Per-reel links</h2>
      <p>Each reel has its own automation. Reel A can send <em>https://link-for-reel-a.com</em>, Reel B sends a completely different URL.</p>
      <h2>Editing a link</h2>
      <p>Open the automation editor for any reel, update the Link field, and save. The new URL is used for all future sends — no restart, no downtime.</p>
      <p>Full edit history is kept, so you can see when each change was made.</p>
    `,
  },
  {
    slug: 'trigger-keywords',
    title: 'Trigger keywords & matching',
    category: 'Automation rules',
    order: 1,
    bodyHtml: `
      <h2>How keyword matching works</h2>
      <p>Matching is <strong>case-insensitive</strong> and by default uses "contains" — so a keyword of <em>link</em> also matches "LINK please!!" or "send me the link".</p>
      <p>Switch to "exact" mode if you only want to match the keyword on its own (rare — most creators use "contains").</p>
      <h2>Multiple keywords</h2>
      <p>Add as many keywords as you like. A comment matching <em>any one</em> of them triggers the automation.</p>
    `,
  },
  {
    slug: 'old-comments-backfill',
    title: 'Old comments & old reels',
    category: 'Automation rules',
    order: 2,
    bodyHtml: `
      <h2>The 7-day rule</h2>
      <p>Instagram only allows private replies for comments made within the last <strong>7 days</strong>. Comments older than 7 days are marked "skipped" — we never try to DM them, and we tell you clearly why.</p>
      <h2>Answer old comments toggle</h2>
      <p>Turn on "Answer old comments" in your automation editor to also DM people who commented <em>before</em> you set up the automation — as long as their comment is less than 7 days old.</p>
      <p>Live video comments can only be answered during the broadcast (Meta rule).</p>
    `,
  },
  {
    slug: '24-hour-window',
    title: 'The 24-hour DM window',
    category: 'Automation rules',
    order: 3,
    bodyHtml: `
      <h2>How the window works</h2>
      <p>When someone comments, we send them your private reply. That's the first contact. If they <em>reply to that DM</em>, a 24-hour messaging window opens — and we use that window to send the "Get Link" button and eventually the link.</p>
      <h2>What if they never reply?</h2>
      <p>The follow-up button step waits safely. When the window expires (24h with no activity), the conversation closes. <strong>Nothing is ever sent outside an open window</strong> — we never cold-DM anyone.</p>
    `,
  },
  {
    slug: 'public-comment-replies',
    title: 'Public comment replies',
    category: 'Automation rules',
    order: 4,
    bodyHtml: `
      <h2>The "check your DMs" nudge</h2>
      <p>When enabled, after sending the private DM we also reply publicly under the original comment with something like <em>"📩 Check your DMs — sent you the link!"</em></p>
      <p>This is optional but tends to increase reply rates because other viewers see it and are curious.</p>
    `,
  },
  {
    slug: 'troubleshoot-dms-stopped',
    title: '"My DMs stopped sending"',
    category: 'Troubleshooting',
    order: 1,
    bodyHtml: `
      <h2>Common causes</h2>
      <ul>
        <li><strong>Token expired:</strong> Your Instagram connection needs to be refreshed. Go to Settings → Connections and click Reconnect.</li>
        <li><strong>Rate limit (code 80002):</strong> Instagram asked us to slow down temporarily. We retry automatically — no action needed. You'll see an amber badge on the dashboard.</li>
        <li><strong>Automation is OFF:</strong> Check that the toggle on your reel card is ON.</li>
      </ul>
    `,
  },
  {
    slug: 'troubleshoot-unexpected-message',
    title: '"Someone got a message but never commented"',
    category: 'Troubleshooting',
    order: 2,
    bodyHtml: `
      <h2>They DM\'d you directly</h2>
      <p>If you have an Inbound-DM automation active, anyone who messages your account directly gets an automated reply. This is separate from comment automation.</p>
      <p>To turn it off: <strong>Settings → Default automation → Inbound DMs → Disable</strong>.</p>
      <p>Important: we only ever reply inside an open conversation window — we never cold-DM anyone who hasn\'t messaged you first.</p>
    `,
  },
  {
    slug: 'plans-and-limits',
    title: 'Plans & limits',
    category: 'Account & billing',
    order: 1,
    bodyHtml: `
      <h2>Plan overview</h2>
      <table>
        <tr><th>Plan</th><th>IG Accounts</th><th>DMs/month</th><th>Price</th></tr>
        <tr><td>Free</td><td>1</td><td>500</td><td>$0</td></tr>
        <tr><td>Starter</td><td>2</td><td>5,000</td><td>$19/mo</td></tr>
        <tr><td>Pro</td><td>5</td><td>25,000</td><td>$49/mo</td></tr>
        <tr><td>Agency</td><td>25</td><td>200,000</td><td>$149/mo</td></tr>
      </table>
      <p>Upgrade anytime — limits apply from the next billing cycle for quotas, immediately for feature access.</p>
    `,
  },
];

async function seed() {
  console.log('[seed] Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected.');

  // ── Plans ──────────────────────────────────────────────────────────────────
  console.log('[seed] Upserting plans…');
  for (const plan of PLANS) {
    await PlanModel.updateOne({ key: plan.key }, { $set: plan }, { upsert: true });
    console.log(`  ✓ plan:${plan.key}`);
  }

  // Verify indexes
  const planIndexes = await PlanModel.collection.getIndexes();
  console.log('[seed] Plan indexes:', Object.keys(planIndexes).join(', '));

  // ── System Templates ────────────────────────────────────────────────────────
  console.log('[seed] Upserting system templates…');
  for (const tpl of SYSTEM_TEMPLATES) {
    await TemplateModel.updateOne(
      { name: tpl.name, isSystem: true },
      { $set: { ...tpl, userId: null } },
      { upsert: true }
    );
    console.log(`  ✓ template:"${tpl.name}" (${tpl.kind})`);
  }

  // ── Help Articles ───────────────────────────────────────────────────────────
  console.log('[seed] Upserting help articles…');
  for (const article of HELP_ARTICLES) {
    await HelpArticleModel.updateOne(
      { slug: article.slug },
      { $set: article },
      { upsert: true }
    );
    console.log(`  ✓ help:${article.slug}`);
  }

  console.log('\n[seed] ✅ Done! Seeded:');
  console.log(`  ${PLANS.length} plans`);
  console.log(`  ${SYSTEM_TEMPLATES.length} system templates`);
  console.log(`  ${HELP_ARTICLES.length} help articles`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] ❌ Error:', err);
  process.exit(1);
});
