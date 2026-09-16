# ReplyBridge Frontend Redesign — Prompt for Antigravity

Paste everything below this line into Antigravity as one instruction.

---

You are the lead product designer and frontend architect for **ReplyBridge**, an Instagram comment-to-DM automation SaaS (by Craftovon). A creator connects their Instagram account, picks reels, and sets up automations: someone comments a keyword (or any comment) → they get a private reply → a "Get Link" button → the reel's specific link. The current frontend is functional but visually generic — plain cards, default spacing, no point of view. You are rebuilding it end to end.

Do not skip straight to code. Work in the two passes below, in order.

## Pass 1 — Design plan (write this out before touching code)

Ground the design in what this product actually is: a tool creators use to turn Instagram engagement into direct conversations, in real time, without manual replying. The audience is Instagram creators and small businesses — visually minded people who live in Instagram's own app daily, so the bar for polish is set by Instagram/Linear/Notion-caliber product design, not generic SaaS-dashboard-template design. Avoid anything that reads as an AI-generated default: no warm cream background with a terracotta accent, no near-black-with-single-neon-accent, no identical rounded cards with the same soft grey shadow under everything, no tracked-out ALL-CAPS eyebrow labels, no numbered 01/02/03 markers unless the content is genuinely a sequence, no em-dash-separated labels, no arrow appended to every button.

Produce, in writing, before building anything:
- **Color** — a base palette of 4–6 named hex values, for both a light and a dark theme (not just an inverted dark mode — treat each as its own considered palette sharing the same accent logic). Instagram's own gradient (magenta→orange) is fair territory for a small, deliberate accent moment (e.g. the active nav item, a primary button, a chart line) — not painted across the whole UI.
- **Type** — pick real typefaces (e.g. a distinctive grotesk/sans pairing — not literally "Inter" as the whole identity), define their roles (display, UI, data/mono if used), and set an actual type scale with intentional jumps, not evenly-stepped sizes.
- **Layout** — describe the layout logic in prose plus quick ASCII wireframes for the hero, the dashboard, and the settings page. State the alignment approach (left-aligned working canvas vs. centered marketing moments) and where asymmetry or grid-breaking is earned vs. where a calm grid serves the data.
- **Principles** — 3–4 sentences on what makes this specific product's UI unique, tied to what a creator is actually doing (monitoring live automations, editing a link mid-campaign, watching DMs go out) rather than generic "clean and modern" language.

Then review that plan against this brief: if a choice would show up in almost any SaaS redesign prompt, replace it with something earned by this product's actual content and workflows. State what you changed and why before writing code.

## Pass 2 — Build

### Theming
Full light and dark theme support, both fully designed (not just a dark overlay). Store the preference as a setting on the **Settings** page (System / Light / Dark), persisted, applied instantly with no flash-of-wrong-theme on load.

### Reference layouts to follow (images provided separately — analyze and match their structure, not their literal content)
- **Auth, desktop**: clean split screen — a form pane (email/password + "Continue with Google") on one side, a live product preview/mockup on the other, generous whitespace, precise input focus states, inline validation.
- **Auth, mobile**: a floating rounded bottom-sheet-style card over a dimmed background, with stacked provider buttons (Google, Email) with consistent icon alignment and subtle border rings — not a full-screen form.
- **Settings**: a persistent left-hand category tree (e.g. General, Instagram Accounts, Templates, Notifications, Billing, Danger Zone) with clear section dividers inside each pane, smooth toggle-switch animations, and a save action that stays reachable (sticky header or footer) without shouting for attention.
- **Navigation**: desktop gets a collapsible sidebar grouped by area (Workspace: Dashboard/Reels/Inbox — Automations: Templates/Analytics — Account: Settings). Mobile gets a floating pill-shaped bottom bar (Home, Reels, Analytics, Settings) with an elevated/frosted-glass surface, current-page state clearly distinct from the rest.

### Pages to rebuild
- **Landing** — a hero that opens on the product's most characteristic moment (e.g. a live-feeling preview of a comment turning into a DM), not a generic headline-plus-gradient-blob. Real supporting copy, not lorem ipsum.
- **Auth (login/register)** — per the reference layouts above, both breakpoints.
- **Dashboard** — the day's real numbers (DMs sent, comments matched, link taps, active automations) laid out with intent, not a uniform 4-card grid; a clear onboarding checklist state for new users; a recent-activity feed.
- **Reels** — the grid of connected reels, automation status per reel, quick toggle, search/filter (All / Automated / Not automated).
- **Automation editor** — trigger setup, private reply + template picker, public comment-reply toggle, follow-up button config, the per-reel destination link with edit history, backfill toggle for old comments.
- **Templates** — library of saved reply templates, system-provided vs. user-saved, filterable by type.
- **Inbox** — active conversations mid-flow (awaiting reply / link sent / completed), so a creator can see exactly who's mid-automation.
- **Analytics** — DMs-over-time, comments matched, link-tap CTR, per-automation breakdown, CSV export.
- **Settings** — theme toggle, connected Instagram accounts with token health, plan/billing, team/account, danger zone.

### Interaction and feedback
Every network action (connecting Instagram, saving an automation, sending a test DM, fetching reels) shows a specific, status-aware loading state with real descriptive text — "Connecting to Instagram…", "Saving automation…", "Sending test message…" — never a bare spinner or a frozen button. Use one deliberate, orchestrated motion moment per major view (e.g. the dashboard's first load) rather than scattering fade-and-slide-up entrances on every card and hover transition on every element — motion should answer what the person just did (opened something, confirmed something, changed something), not decorate the page.

### Writing
Write all interface copy from the end user's perspective, in plain, specific language — a creator manages "connected accounts," not "OAuth tokens"; buttons say exactly what they do ("Save automation," not "Submit"); empty states are invitations to act ("No reels yet — connect Instagram to import them"), not apologies; errors state what happened and how to fix it, never vaguely.

### Technical scope
Before writing any new code, read through the existing `apps/web` codebase in this repo — every page, the API client, the routing setup, and the auth/token flow — and confirm you understand exactly what each page currently calls and depends on. You have access to the full backend as well, so you're free to add new API endpoints or adjust existing ones where a better frontend experience genuinely calls for it. You have full latitude on component architecture, animation libraries, folder structure, and any additional feature you think genuinely improves this product (e.g. a live activity toast when a DM sends, keyboard shortcuts, a command palette) — use your judgment, but keep additions earned by the product's real workflows rather than decoration.

**Hard boundary — do not touch the automation pipeline.** This is a visual/frontend redesign task, not a backend task. The comment→DM automation engine (`apps/workers/*`, the webhook intake route, the Graph API client in `packages/graph/*`, the `Automation`/`ConversationState`/`IgAccount` models and their schemas, and any OAuth/token-exchange code) was hard-won through extensive debugging and is currently working correctly end to end. Do not refactor, "clean up," rename fields in, or otherwise modify any of that code as a side effect of the frontend work, even if it looks improvable — changing it risks silently breaking comment detection, private replies, or DM delivery in ways that are very time-consuming to re-diagnose. If a new frontend feature genuinely requires a new read-only API endpoint (e.g. a new dashboard chart), add a new endpoint rather than modifying existing automation logic, and flag clearly in your summary exactly which backend files you touched and why, so they can be reviewed with extra care. When in doubt, leave the backend automation code untouched and design the frontend around what it already returns.

Responsive down to mobile throughout, visible keyboard focus states, reduced-motion respected, accessible color contrast in both themes.

### Self-critique before finishing
Before considering this done, review your own output against Pass 1's plan: does it still look like this specific product, or could it be any SaaS dashboard with the labels swapped? Cut anything decorative that doesn't serve the actual workflow. Spend boldness in one place per page — let one element be the memorable thing, keep the rest quiet and disciplined.
