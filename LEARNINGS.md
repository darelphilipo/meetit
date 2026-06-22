# Devvit App Development: Learnings & Workflow

> **Project:** Meetit - Community Meetup Manager for Reddit
> **Stack:** Devvit Web (TypeScript + HTML/CSS), Redis, Scheduler
> **Design:** Stitch Neo-Brutalist (Space Grotesk, neon yellow/hot pink, hard shadows)

---

## 0. Core Principles (Non-Negotiable)

### 0.1 Every Feature Must Have Adequate Logging

**Why:** Devvit Web inline webview does NOT surface `console.log`. The only way to debug production issues is via:
- **Server logs:** `devvit-cli logs r/meetup_hub2_dev` (visible in terminal)
- **Client logs:** Custom on-screen debug panel (`#debug-panel` with 📋 Copy All button)

**Without logging, you are flying blind.** When a user reports "it didn't work", you have zero visibility into what happened.

**Rule:** For every new feature, you MUST add:

1. **Client-side (app.ts)** — Use the `log()` function (not `console.log`):
   ```typescript
   log("featureName action=id state=detail");
   // GOOD: log("rsvp submit eventId=abc123 email=yes");
   // BAD: console.log("submitted");  // Never surfaces in production!
   ```

2. **Server-side (server.ts)** — Use `console.log()` with structured prefixes:
   ```typescript
   console.log(`[FEATURE] action detail | key=value`);
   // GOOD: console.log(`[RSVP] ${username} → ${eventId} | email=${!!email}`);
   // BAD: console.log("done");  // Useless in log stream
   ```

3. **Critical paths to log:**
   - Entry/exit of every user action handler
   - State mutations (cache updates, optimistic updates)
   - Error paths (with full error message)
   - External API calls (webhooks, Reddit API)
   - Data transformations (sorting, filtering, pagination)

4. **Pre-deployment checklist:**
   - [ ] Search for `console.log` in app.ts → replace with `log()`
   - [ ] Search for bare `console.log` in server.ts → add `[FEATURE]` prefix
   - [ ] Verify debug panel shows logs when testing
   - [ ] Run `devvit-cli logs` and confirm server logs appear

**Example from RSVP feature:**
```
Client: "submitRsvp eventId=abc123" → "optimistic RSVP update: abc123 count=5" → "RSVP confirmation card shown"
Server: "[RSVP] user123 → event_xxx (email=yes, phone=no)"
```

### 0.2 Every Fix/Enhancement Gets Logging — No Exceptions

**Why:** A fix without logging is invisible in production. When the fix regresses or an edge case is missed, you have no trail to debug.

**Rule:** Every time you merge a fix or enhancement, BEFORE the commit:
1. **Add a `log()` call at the entry point of the changed path** — e.g., `log("fixName intent=")`
2. **Add a `log()` call at each decision branch** — e.g., `log("fixName staying on My Stuff tab=")` vs `log("fixName going home")`
3. **Add server-side logging** — e.g., `console.log(\`[FIX] detail\`)` for any server changes
4. **Search the changed code** — any `catch` blocks missing logging? Any early returns?
5. **Verify in debug panel** — open the app, trigger the flow, confirm logs appear

**Checklist for every commit:**
```
[ ] Entry log added at the changed path
[ ] Each branch/decision has a unique log
[ ] Error paths are logged
[ ] Server changes have [FEATURE] prefixed logs
[ ] Verified in app's debug panel
```

**Bad commit (no logging):**
> "fix: stay on My Stuff after leaving"

**Good commit (with logging):**
> "fix: stay on My Stuff after leaving\n\nLogging: leaveEvent staying on My Stuff, leaveEvent RSVPs empty switching to events, leaveEvent going home"

### 0.2 Viewing Server Logs Without CLI

**Problem:** Running `devvit-cli logs r/meetup_hub2_dev` every time is tedious.

**Solution:** Server logs are automatically captured into Redis (`meetit:server_logs` sorted set, last 100 entries). The debug panel has a **📱 Client / 🖥️ Server** toggle button that fetches and displays backend logs inline.

**How it works:**
1. Every `console.log()` in `server.ts` is also sent to `serverLog()` which stores in Redis
2. Client calls `/api/server-logs` to retrieve them
3. Debug panel renders them with color-coded levels (green=info, red=error)

**To use:**
1. Tap 🐛 debug button
2. Tap 📱 Client button → switches to 🖥️ Server
3. Server logs appear (auto-fetched from Redis)
4. Tap 📋 Copy All to copy server logs to clipboard

**No CLI required.**

---

## 1. Development Workflow (Step-by-Step)

### 1.1 Prerequisites
```powershell
# Install Devvit CLI globally
npm install -g @devvit/cli

# The CLI installs as 'devvit-cli' on Windows - NOT 'devvit'
devvit-cli --version   # Verify installation
```

### 1.2 Initialize a New Project
```powershell
# Navigate to your project folder
cd "D:\code workspace\reddit"

# Initialize via the web flow (opens browser for OAuth)
devvit-cli init

# Select "Bare" template for maximum control
# Complete OAuth authorization → code is auto-captured
```

### 1.3 Daily Dev Loop
```powershell
# 1. Make code changes to src/ and public/

# 2. Upload new version (bumps version automatically)
cd "D:\code workspace\reddit\meetup-hub"
devvit-cli upload --bump patch --copy-paste

# 3. The CLI will show an OAuth URL → open in browser
#    Save the token → paste back into terminal

# 4. CRITICAL: Go to https://developers.reddit.com/apps/meetup-hub
#    Click the BLUE "Update" button next to "My Installations"
#    If you skip this, your test subreddit runs the OLD version

# 5. Test at your playtest subreddit (auto-created)
#    e.g., https://www.reddit.com/r/meetup_hub2_dev/

# 6. View logs for debugging
devvit-cli logs r/meetup_hub2_dev
```

### 1.4 Key Workflow Tips
- **Always have 3 things open side by side:**
  1. VS Code (editing code)
  2. Terminal at project root (for upload commands)
  3. Browser with the OAuth URL tab + test subreddit tab
- **Token flow:** OAuth URL → authorize → copy code → paste in terminal → click Update on developer portal
- **After every single upload**, hit "Update" on the developer portal or you'll test old code

---

## 2. Architecture Decisions

### 2.1 Devvit Web vs Devvit Blocks
| Aspect | Devvit Web (HTML/iframe) | Devvit Blocks (JSX) |
|--------|-------------------------|---------------------|
| Rendering | HTML/CSS/JS in iframe | Native Reddit components |
| Launch screen | Shows "Launch App" button | Renders directly in post |
| Flexibility | Full HTML/CSS control | Limited to Block components |
| Use case | Complex UIs, custom designs | Simple interactive posts |

**Our choice:** Devvit Web (HTML) for full Neo-Brutalist design control

### 2.2 Inline Mode (`inline: true`)
```json
// devvit.json
"post": {
  "entrypoints": {
    "default": {
      "entry": "app.html",
      "height": "tall",
      "inline": true   // ← THIS makes it render directly, no "Launch App" button
    }
  }
}
```
- Without `inline: true` → shows "Launch App" button (users must click to interact)
- With `inline: true` → loads directly, like Reddit games (Pixelary, etc.)
- **Tradeoff:** Strict performance requirements, no external requests from client

### 2.3 Server Architecture (Raw HTTP)
Our template used raw Node.js HTTP (no Express/Hono):
```ts
// src/server/server.ts
export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse) {
  const url = req.url;
  // Manual routing via switch/case on endpoint URLs
  switch (endpoint) {
    case "/api/home": body = await onHome(); break;
    case "/api/submit-event": body = await onSubmitEvent(req); break;
  }
}
```
- Devvit imports come from `@devvit/web/server` (NOT `@devvit/public-api`)
- Redis, Reddit API, settings, scheduler - all from same import
- Server must output CommonJS (CJS) format → esbuild `format: "cjs"`

### 2.4 Client Architecture
- Single HTML file (`app.html`) with inline CSS
- External JS bundled by esbuild (`src/client/app.ts` → `public/app.js`)
- Client fetch can ONLY hit `/api/*` endpoints (CSP restriction)
- NO external fetch from client (facepunch, external APIs blocked)
- Google Fonts work if domain is in global allowlist

---

## 3. Unique Fixes & Workarounds

### 3.1 Mobile Scroll Issue (Critical Fix)
**Problem:** Devvit Web inline webviews on mobile Reddit app cannot scroll internally.
Content taller than viewport gets clipped and inaccessible.

**Fix 1 - Multi-step forms:** Break long forms into steps (2 fields per step max)
```
Step 1: Title + Organizer    → [Next →]
Step 2: Date + Time          → [Next →]
Step 3: Location + Maps URL  → [Next →]
Step 4: Description + Review → [✓ Submit]
```

**Fix 2 - Floating scroll arrows:** Add ⬆ ⬇ buttons to right side of screen
```html
<div class="scroll-nav">
  <button id="scroll-up">⬆</button>
  <button id="scroll-down">⬇</button>
</div>
```
```css
.scroll-nav { position: fixed; right: 4px; top: 50%; transform: translateY(-50%); z-index: 500; }
```
```js
window.scrollBy({ top: 200, behavior: "smooth" }); // Scroll 200px per click
```

### 3.2 onclick Handlers NOT Working (CSP Fix)
**Problem:** Inline `onclick="myFunction()"` in HTML doesn't fire in Devvit webview.
Content Security Policy blocks inline event handlers.

**Fix:** Use `addEventListener` with CSS class-based selectors
```html
<!-- DON'T do this -->
<button onclick="submitForm()">Submit</button>

<!-- DO this instead -->
<button class="btn-submit-form">Submit</button>
```
```js
// Bind event listeners after DOM renders
document.querySelectorAll(".btn-submit-form").forEach(function(btn) {
  btn.addEventListener("click", submitForm);
});
```
- Call `bindButtons()` after every `innerHTML` mutation
- Use `data-*` attributes for parameters: `<button data-id="123">`

### 3.3 Modmail API Not Available in Devvit Web
**Problem:** `reddit.modMail.createConversation()` doesn't exist in Devvit Web's Reddit API.
`reddit.sendPrivateMessage()` also not available.

**Fix:** Save data to Redis and show in Mod Dashboard instead
```ts
// Instead of sending modmail, save to Redis:
await redis.hSet("meetit:pitched_ideas", {
  [ideaId]: JSON.stringify(idea),
});
// Then display in Mod Dashboard for moderator review
```

### 3.4 Mod Detection Fails Intermittently
**Problem:** `context.username` or `context.subreddit` may be undefined in Devvit Web.
`reddit.getModerators()` may fail silently.

**Fix:** Add extensive logging for debugging
```ts
console.log(`isMod: checking ${username} against mods for r/${subredditName}`);
```
Also check both `mod.name === username` AND `mod.name === u/${username}`

### 3.5 Scheduler Uses Endpoint-Based Approach
**Problem:** Tried `scheduler.on("job-name", handler)` → doesn't exist in Devvit Web.

**Fix:** Define tasks in `devvit.json`, handle via HTTP endpoints
```json
// devvit.json
"scheduler": {
  "tasks": {
    "send_24hr_reminders": {
      "endpoint": "/internal/scheduler/send-24hr-reminders"
    }
  }
}
```
```ts
// server.ts - Handle like any other endpoint
case InternalEndpoint.SendReminders:
  body = await onSendReminders(req);
  break;

// Trigger via scheduler.runJob()
await scheduler.runJob({
  name: "send_24hr_reminders",
  data: { eventId },
  runAt: reminderDate,
});
```

### 3.6 Settings Must Be Defined in devvit.json
**Problem:** Using `settings.get()` works, but settings must be declared in config.

**Fix:** Define in `devvit.json` under `settings.subreddit`:
```json
"settings": {
  "subreddit": {
    "primary_color": {
      "type": "string",
      "label": "Primary Color",
      "defaultValue": "#ffff00"
    }
  }
}
```
```ts
// Access in server
import { settings } from "@devvit/web/server";
const color = await settings.get("primary_color");
```

### 3.7 Default Event as Placeholder
Always include a hardcoded fallback event in the HTML so the UI renders instantly:
```html
<!-- Hardcoded default event - always visible even if API fails -->
<div class="event-card">
  <h3>Bangalore Tech &amp; Chai</h3>
  <button data-id="default-event-123">View Details</button>
</div>
```
Live data loads async in background and replaces static content.

### 3.8 esbuild Windows EFTYPE Error
**Problem:** `Error: spawn EFTYPE` on Windows with esbuild native binary.

**Fix:** Ensure `esbuild` version in `package.json` matches `devDependencies`.
Clean install: delete `node_modules`, run `npm install`.

---

## 4. Project File Structure
```
meetit/
├── devvit.json          # App config (entrypoints, permissions, scheduler, settings)
├── package.json         # Dependencies (@devvit/web, esbuild, typescript)
├── tools/
│   └── build.ts         # esbuild build script (client → ESM, server → CJS)
├── public/
│   └── app.html         # Main HTML with Stitch Neo-Brutalist CSS
├── src/
│   ├── client/
│   │   └── app.ts       # All client-side UI logic (tabs, forms, overlays, event binding)
│   ├── server/
│   │   ├── index.ts     # Devvit Web server entry (createServer)
│   │   └── server.ts    # All API handlers + Redis + Reddit API + Scheduler
│   └── shared/
│       └── api.ts       # Shared TypeScript types + endpoint constants
└── .opencode/
    └── mcp.json         # MCP servers (devvit, stitch)
```

---

## 5. Redis Data Schema (Meetit)
```
meetit:active_events    → Hash  { event_id: JSON(event) }        # Published events
meetit:pending_events   → Hash  { event_id: JSON(event) }        # Awaiting approval
meetit:pitched_ideas    → Hash  { idea_id: JSON(idea) }          # User pitch ideas
meetit:rsvps:<event_id> → Sorted Set { username: Date.now() }    # RSVPs per event
```

Redis operations used: `hGetAll`, `hSet`, `hDel`, `hGet`, `zAdd`, `zCard`, `zScore`, `zRem`, `zRange`

---

## 6. UI Pattern: Multi-Step Overlays
```html
<div class="overlay" id="my-overlay">
  <div class="overlay-header"><h2>Title</h2><div class="close-btn">✕</div></div>
  <div class="overlay-progress">
    <div class="step-dot done"></div>
    <div class="step-dot"></div>
    <div class="step-dot"></div>
  </div>
  <div class="overlay-body" id="step-1">...</div>
  <div class="overlay-body hidden" id="step-2">...</div>
  <div class="overlay-body hidden" id="step-3">...</div>
  <div class="overlay-footer">
    <button class="footer-btn footer-btn-prev">← Back</button>
    <button class="footer-btn footer-btn-next">Next →</button>
  </div>
</div>
```

Key CSS for mobile-friendly overlays:
- `position: fixed; top: 0; left: 0; width: 100%; height: 100%;` (fullscreen)
- `overflow-y: auto; -webkit-overflow-scrolling: touch;` (iOS momentum scroll)
- `align-items: flex-start;` (content starts at top, not centered)
- Compact footer with ← Back (left) and Next → (right) buttons

---

## 7. Devvit Web API Reference

### Server imports
```ts
import { context, reddit, redis, scheduler, settings } from "@devvit/web/server";
import type { PartialJsonValue, UiResponse, TaskRequest, TaskResponse } from "@devvit/web/shared";
```

### Available APIs (confirmed working)
| API | Usage |
|-----|-------|
| `redis.hGetAll(key)` | Get all hash fields |
| `redis.hSet(key, { field: value })` | Set hash fields |
| `redis.hDel(key, fields[])` | Delete hash fields |
| `redis.hGet(key, field)` | Get single hash field |
| `redis.zAdd(key, { member, score })` | Add to sorted set |
| `redis.zCard(key)` | Count sorted set members |
| `redis.zScore(key, member)` | Get member score (null if not found) |
| `redis.zRem(key, [members])` | Remove members from sorted set |
| `redis.zRange(key, min, max, { by: 'score' })` | Get range with scores |
| `reddit.submitCustomPost({ title, entry? })` | Create app post |
| `reddit.getModerators(subredditName)` | Get mod list |
| `settings.get(key)` | Get setting value |
| `scheduler.runJob({ name, data, runAt })` | Schedule one-off job |
| `context.username` | Current Reddit username |
| `context.subreddit` | Current subreddit name |
| `context.postId` | Current post ID |

### Not available in Devvit Web
- `reddit.modMail.createConversation()` ❌
- `reddit.sendPrivateMessage()` ❌ (for reminders, handled via scheduler endpoint)
- `reddit.submitComment()` - confirmed available ✅

---

## 8. Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `No project devvit.yaml found` | Running from wrong directory | `cd` to project root first |
| `config requires property "post", "server", or "blocks"` | Invalid devvit.json format | Use correct schema |
| `Router.GetOrLoadActor: remote bootstrap` | Server crash on startup | Check imports, remove `scheduler.on()` |
| `scheduler.on is not a function` | Wrong API in Devvit Web | Use endpoint-based scheduler |
| `Invalid target "es2023"` | Old esbuild version | Update esbuild or lower target |
| `Could not resolve @devvit/protos/...` | esbuild can't bundle Devvit internals | Use external packages |
| `Not currently logged in` | Auth token expired | Run `devvit-cli login` |

---

## 9. Checklist for New Devvit App

- [ ] Install Devvit CLI: `npm install -g @devvit/cli`
- [ ] Initialize: `devvit-cli init` → select "Bare" template
- [ ] Configure `devvit.json`: permissions (redis, http, reddit), entrypoints, scheduler, settings
- [ ] Set `"inline": true` in default entrypoint for direct rendering
- [ ] Use `addEventListener` for all button clicks (NOT onclick attributes)
- [ ] Use external JS/TS files for client logic (NOT inline `<script>`)
- [ ] Server routes: `/api/*` for client calls, `/internal/*` for triggers/scheduler
- [ ] Always include hardcoded fallback data in HTML for instant rendering
- [ ] Break long forms into multi-step overlays (2 fields per step)
- [ ] Add scroll navigation buttons for mobile (⬆ ⬇)
- [ ] Server builds to CJS (CommonJS), client to ESM
- [ ] Remember to click "Update" on developer portal after each upload
- [ ] Check `devvit-cli logs r/yoursubreddit` for debugging

---

## 10. Community Repo Patterns (11 Apps Analyzed)

### 10.1 Redis Patterns

**📌 Redis as TTL-based scheduler** (`only-flairs`)
Instead of `Devvit.addScheduler`, use `context.redis.expire(key, seconds)`. When a post's restriction expires, the key auto-deletes. On trigger, missing key = feature inactive. Zero infra overhead.

**📌 Modlist caching as CSV string** (`only-flairs`, `mod-mentions`, `admin-tattler`)
```ts
// Store mods as comma-separated string (NOT JSON array)
const mods = await subreddit.getModerators({ pageSize: 500 }).all();
await redis.set("mods", mods.map(m => m.username).join(","));
// Retrieve with O(1) lookup
const isMod = (await redis.get("mods")).split(",").includes(username);
```
Invalidate on `AppInstall`, `AppUpgrade`, and `ModAction` triggers.

**📌 Sentinel values for empty/unscored states** (`user-scorer`)
Use `-1` as "unscored" to distinguish from genuine `0.0`. Avoids `null` vs `0` ambiguity. For hash fields that may not exist, use placeholder values.

**📌 Hash-per-field for concurrent writes** (`user-scorer`)
When two triggers (`CommentSubmit` + `ModAction`) can fire simultaneously, use Redis hashes with per-field writes (`hSet`) rather than serializing/deserializing the full object — avoids race-condition overwrites.

**📌 Capped arrays via `trimArray`** (`user-scorer`, `mod-mentions`)
```ts
function trimArray(arr: string[], max: number): string[] {
  while (arr.length > max) arr.shift();
  return arr;
}
```
Prevents unbounded Redis storage. Mod-mentions caps at 50 entries, user-scorer at 1000.

**📌 Eventually consistent writes** (Meetit discovery)
`zRem` returns 0 immediately after write but the member IS removed — verification reads may show stale data. Trust the write; don't immediately verify. Subsequent reads will be correct.

### 10.2 Trigger Architecture

**📌 Pre-emptive content caching** (`admin-tattler`)
Cache every post/comment body on `PostSubmit`/`CommentSubmit` with 30-day TTL. When Admin action fires and finds `[ Removed by Reddit ]`, fall back to cache. Avoids racing to fetch content after it's already nuked.

**📌 Race condition handling with delayed scheduler** (`user-scorer`)
When `ModAction` fires before `CommentSubmit` has tracked the comment, detect the race (`!data`), then schedule a 5-second delayed retry via `scheduler.runJob()`. Human-triggered mod actions on untracked comments are logged; AutoModerator races are retried.

**📌 Grace period on install** (`bot-bouncer`)
A 7-day `IN_GRACE_PERIOD` key makes the system treat all users as "recently active." Existing flagged users get processed retroactively even without new content.

**📌 Event body recovery for redacted authors** (`bot-bouncer`)
When Reddit hides author names (`[redacted]`), fetch the post/comment by ID to get the real `authorName`, then proceed normally.

### 10.3 Scheduler Patterns

**📌 Self-chaining jobs** (`bot-bouncer`)
When work exceeds a single job's time limit (50 users per 15s), the job re-enqueues itself:
```ts
if (workRemaining) {
  await scheduler.runJob({ name: "my-job", runAt: addSeconds(5), data: { cursor } });
}
```
The job "daisy-chains" itself until work is complete. Avoids Devvit's 30-second timeout.

**📌 Randomized cron minutes** (`bot-bouncer`)
For apps installed on thousands of subreddits:
```ts
const minute = Math.floor(Math.random() * 60);
const cron = `${minute} * * * *`;
```
Prevents thundering-herd API spikes when all installations fire simultaneously.

**📌 Dual scheduling (interval + cron)** (`microlympics`)
Run `setInterval` in addition to Devvit's cron scheduler for redundant coverage. Helps catch missed cron executions.

**📌 Cleanup via sorted-set-based queues** (`bot-bouncer`)
Instead of cron-scanning all data, add items to a sorted set with cleanup date as score. Cleanup job processes only items with `score < Date.now()`. Efficient at any volume.

### 10.4 Devvit Blocks ↔ WebView Integration

**📌 Splash → WebView funnel** (`template-phaser-devvit`)
SplashScreen must be Devvit Blocks UI (JSX). WebView can ONLY be mounted from an explicit user action (button click). Never auto-mount the webview.

**📌 postMessage bridge pattern** (`template-phaser-devvit`)
```ts
// Devvit → WebView
ui.webView.postMessage("devvit-message", { type: "INIT", data });

// WebView → Devvit
window.parent.postMessage({ type: "SAVE_SCORE", score: 100 }, "*");
```
All communication between Blocks and WebView goes through this bridge. Use shared TypeScript types for the message contract.

**📌 Runtime environment detection** (`template-phaser-devvit`)
```ts
const isEmbedded = window !== window.top; // true = in Devvit webview
```
When standalone (Vite dev server), inject mock data. When embedded, request real data via postMessage. Enables local development without Devvit CLI.

**📌 Phaser integration** — Use Vite manual chunking (`rollupOptions.manualChunks`) to separate Phaser into its own bundle. Standard 5-scene flow: Boot → Preloader → Menu → Game → GameOver. `Phaser.Scale.EXPAND` for responsive sizing.

### 10.5 HTTP Fetch & Webhook Patterns

**📌 URL-as-platform-discriminator** (`mod-mail-to-discord`, `admin-tattler`, `mod-mentions`)
```ts
if (webhookUrl.startsWith("https://hooks.slack.com/")) { /* Slack payload */ }
else if (webhookUrl.match(/discord(?:app)?.com\/api\/webhooks/)) { /* Discord payload */ }
```
No need for a separate "platform" setting — detect from URL.

**📌 Dual-platform payloads** (`mod-mail-to-discord`)
- **Slack**: Flat `text` field with MRKDWN syntax (`<url|label>`, `*bold*`)
- **Discord**: Rich `embeds[]` with author, color, footer. Cap description at 4096 chars (Discord limit) with truncation marker

**📌 Per-channel error isolation** (`admin-tattler`)
Each notification channel (Modmail, Slack, Discord) fires independently in sequence. One failing webhook doesn't block others.

**📌 Content compression for webhook payloads** (`bot-bouncer`)
Use `pako.deflate` + base64 for storing large payloads. Fall back to raw storage if compression doesn't save space.

### 10.6 Settings & Configuration

**📌 Settings validation with early throw** (`admin-tattler`, `mod-mentions`)
```ts
function getValidatedSettings() {
  const s = await settings.getAll();
  if (!s.sendModmail && !s.webhookURL) {
    throw new Error("At least one notification channel must be enabled");
  }
  return s;
}
```
Prevents silent no-ops when all features are disabled.

**📌 `settings.get(key)` — individual key fetch** (Meetit discovery)
Always use `settings.get("key")` (singular). `settings.get()` without args returns undefined in Devvit Web.

**📌 Wiki-as-database** (`toolbox-team/storage`)
Store structured data on subreddit wiki pages via `reddit.getWikiPage()`/`updateWikiPage()`. Use `zlib` + base64 for compression to stay under wiki size limits. Schema migration on read ensures backward compatibility.

**📌 Indexed constant arrays** (`toolbox-team/storage`)
Store arrays of strings (moderators, note types) and reference by integer index (`m: 0`) — saves bytes on wiki pages.

### 10.7 Code Organization Patterns

| Pattern | Example | When to use |
|---------|---------|-------------|
| **Single-file** (160 lines) | `Modmail-to-Discord` | Simple event → action apps |
| **6-file separation** | `only-flairs`, `user-scorer`, `mod-mentions` | Apps with forms, storage, handlers |
| **Monorepo** (2 packages) | `toolbox-team/storage` | Library + Devvit wrapper |
| **Express + Devvit hybrid** | `microlympics` | Complex apps needing Express routing |
| **Scene-based** (Phaser) | `template-phaser-devvit` | Games with multiple screens |

### 10.8 Platform Quirks & Workarounds

| Quirk | Discovery | Workaround |
|-------|-----------|------------|
| Redis writes eventually consistent | Meetit `zRem` returns 0, then works | Don't immediately verify writes |
| `getModerators()` returns `{children}` not array | Meetit mod detection | Access `.children` property |
| `getModerators()` returns 0 in inline webview | Meetit dev | Not reliable for inline posts |
| `settings.get()` w/o args returns undefined | Meetit settings crash | Always pass key: `settings.get("key")` |
| `zScore` returns `undefined` not `null` | Meetit leave check | Use `!= null` (loose equality) |
| Inline onclick blocked by CSP | Meetit UI | Use `addEventListener` |
| `scheduler.on()` doesn't exist in Devvit Web | Meetit scheduler | Endpoint-based scheduler |
| `modMail.createConversation()` unavailable | Meetit modmail | Save to Redis instead |
| `sendPrivateMessage` error sniffing | `bot-reply-msg` | Catch `"NOT_WHITELISTED_BY_USER"` string |
| `[ Removed by Reddit ]` content loss | `admin-tattler` | Pre-emptive caching on submit |
| Dual `CommentSubmit`+`ModAction` race | `user-scorer` | Delayed retry via scheduler |

---

## 11. Meetit-Specific Deep Debugging Learnings

### 11.1 Redis API Gotchas (Confirmed by Debugging)

**📌 `hDel` requires array format (same as `zRem`)**
```ts
// ❌ Silent failure - does NOT delete
await redis.hDel("myhash", fieldName);

// ✅ Correct - wraps field in array
await redis.hDel("myhash", [fieldName]);
```
Confirmed: `hDel` with single string argument silently succeeds but doesn't delete. Always wrap in array.

**📌 `zScore` returns `undefined` (not `null`) for missing members**
```ts
// ❌ Wrong - undefined !== null evaluates to TRUE
if (score !== null) { /* Thinks member exists */ }

// ✅ Correct - loose equality catches both null and undefined
if (score != null) { /* Accurate */ }
```

**📌 `zRem` eventually consistent**
`zRem` returns 0 immediately but the member IS removed. Don't verify immediately after write. First read may show stale data, second read shows truth.

**📌 Redis writes across all operations are eventually consistent**
Confirmed for `hDel`, `hSet`, `zAdd`, `zRem`. Writes succeed but reads immediately after may return stale data. Trust the write, skip verification.

### 11.2 Devvit Web API Limitations (Confirmed)

**📌 `reddit.submitComment()` — Documented but empirically broken**
Official docs show it as a working Devvit Web API:
```ts
reddit.submitComment({ postId: 't3_123456', text: 'This is a comment', runAs: 'APP' });
```
**However, empirical testing fails with:** `ERR_INVALID_ARG_TYPE: "string" argument ... Received undefined` in both webview HTTP handlers AND CRON endpoint handlers. Likely a platform bug or incomplete implementation. Not usable as of v0.13.

**📌 `reddit.modMail.createConversation()` not available in Devvit Web**
Workaround: Save data to Redis and display in Mod Dashboard.

**📌 `reddit.sendPrivateMessage()` — PARTIALLY WORKS in Devvit Web CRON context** ⭐ NEW
- `sendPrivateMessage({ to: "/r/<subreddit>", ... })` → **WORKS** (modmail to sub mods). Confirmed 2026-05-27: mod alert received with "There are 2 new pending event(s)" message.
- `sendPrivateMessage({ to: "<username>", ... })` → **STILL FAILS** for individual user DMs (ERR_INVALID_ARG_TYPE). Individual reminder PMs still broken.

**📌 `reddit.getModerators()` returns `{children: []}` in playtest subreddits**
Both in inline webview AND trigger context. Works on real production subreddits. Modlist cache pattern (AppInstall/AppUpgrade trigger → cache in Redis) works in production.

**📌 `getModPermissionsForSubreddit()` — More reliable mod detection**
From Community Chats app — works when `getModerators()` fails:
```ts
const user = await reddit.getCurrentUser();
const perms = await user.getModPermissionsForSubreddit(subredditName);
const isModerator = perms && perms.length > 0;
```
Cache result in Redis with 1-minute TTL to avoid calling on every request.

**📌 Redis Transactions (`watch`/`multi`/`exec`) — Available in Devvit Web**
Fully documented atomic operations:
```ts
const txn = await redis.watch('key');
await txn.multi();
await txn.hSet('users', { [username]: JSON.stringify(data) });
await txn.zAdd('scores', { member: username, score: data.score });
await txn.exec();
```
- Max 20 concurrent transactions per installation
- 5-second execution timeout
- Use for atomic RSVP counts, approve-lock operations, or any multi-step Redis write

**📌 `runAs: 'USER'` Permissions — Requires explicit approval**
To act as the Reddit user (not the app), add to `devvit.json`:
```json
"permissions": {
  "reddit": {
    "asUser": ["SUBMIT_POST", "SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT"]
  }
}
```
- Supported APIs: `submitPost()`, `submitCustomPost()`, `submitComment()`
- Playtest: falls back to app account unless app owner takes the action
- Requires explicit approval during app review (extends review time)
- Rules: always ask permission, no automated actions, distinct choices, no gating

### 11.3 Browser API Blockers (CSP in Devvit Web)

**📌 `confirm()` blocked by CSP**
```ts
// ❌ Silently returns false in Devvit webview
if (!confirm("Are you sure?")) return;
```
Use in-app UI confirmation or direct actions without browser dialogs.

**📌 `onclick="fn()"` inline handlers blocked**
Same CSP restriction. Always use `addEventListener` with CSS class-based selectors.

### 11.4 Context Object Differences

**📌 `context.subredditName` vs `context.subreddit`**
Devvit Web docs use `context.subredditName`. Our `context.subreddit` was always `undefined`. Use `context.subredditName || context.subreddit` for safety.

**📌 `context.postId` available in webview API calls**
Returns raw ID like `1t9207d` (not `t3_` prefixed). Some APIs need the `t3_` prefix, so check: `postId.startsWith("t3_") ? postId : "t3_" + postId`.

### 11.5 Scheduler Gotchas

**📌 `scheduler.runJob()` — one-shot jobs NEVER fire in Devvit Web inline context (Empirical)**
Jobs are scheduled (logs confirm `[APPROVE] Reminder scheduled: 2026-05-14T00:00:00.000Z`) but never execute. No `[SCHEDULER] FIRED` log ever appears.

**⚠️ CONTRADICTION:** Official Devvit docs (v0.13) show one-shot `runAt` jobs as fully supported:
```ts
const job = { id: `job-one-off-for-post${postId}`, name: "one-off-task", data: { postId }, runAt: oneMinuteFromNow };
const jobId = await scheduler.runJob(job);
```
The docs also show `runAt: new Date()` (immediate execution) for job daisy-chaining. **However, empirical testing in Devvit Web inline webview confirms they do NOT fire.** This may be a platform bug or context-specific limitation not yet documented. Use CRON-based scheduler as the reliable alternative.

**📌 CRON-based scheduler WORKS in Devvit Web — tested and confirmed**
```json
"scheduler": { "tasks": { "check-events": { "endpoint": "/internal/scheduler/check-events", "cron": "*/5 * * * *" } } }
```
The CRON job fires reliably every 5 minutes. Confirmed by `[CRON] check-events FIRED at 2026-05-15T07:40:31.244Z` in production logs. This is the ONLY scheduler pattern that works in Devvit Web inline context.

**📌 CRON jobs run in a different execution context than webview requests**
- CRON context has `redis`, `reddit.submitCustomPost()` (confirmed working)
- CRON context does NOT have `context.postId` (triggers from server, not user post)
- CRON context MAY have `reddit.sendPrivateMessage()` (untested but attempts logged)
- CRON context does NOT have `reddit.submitComment()` (same limitation)

**📌 Hybrid architecture: Beautiful UI + CRON backend**
```
Devvit Web (HTML/CSS/JS) → User-facing UI (events, RSVPs, forms, mod dashboard)
CRON scheduler (*/5)       → Background tasks (scan events, create reminder posts, send DMs)
Redis                     → Shared data layer between both contexts
```
This bridges the gap between Devvit Web's rich UI and Blocks API's backend capabilities. The CRON job runs server-side, independent of the webview iframe.

**📌 CRON job best practices from this project:**
- Use Redis TTL flags (`meetit:reminded:${eventId}` with 24h TTL) to prevent duplicate processing on next cron tick
- Wrap `submitCustomPost` and `sendPrivateMessage` in individual try-catch blocks so one failure doesn't stop the loop
- Log every event processed with `[CRON]` prefix for easy filtering in logs
- Return `{ status: "ok" }` with HTTP 200 (not string status code)

### 11.6 Settings API

**📌 `settings.get()` without arguments returns `undefined`**
```ts
// ❌ Returns undefined - crashes with "Cannot read properties of undefined"
const s = await settings.get();

// ✅ Fetch individual keys
const primary = await settings.get("primary_color");
```
Always use `settings.get("keyName")` per key.

**📌 Settings must be defined in `devvit.json` under `settings.subreddit`**
With `type`, `label`, and `defaultValue` per setting.

### 11.7 Client-Side Architecture Patterns

**📌 Tab debouncing prevents API flood**
```ts
var tabLoading = false;
function switchTab(tab: string) {
  if (tabLoading || tab === currentTab) return;
  tabLoading = true;
  // ... fetch
  tabLoading = false;
}
```
Without debouncing in inline webview, rapid clicks fire multiple parallel API calls causing sluggishness.

**📌 `bindButtons()` called after every DOM mutation**
After any `innerHTML = ...` call that creates new buttons, call `bindButtons()` to attach event listeners. CSP blocks inline onclick, so listeners must be re-bound.

**📌 Pass parameters via `data-*` attributes**
```html
<button data-id="event_123">Click</button>
```
```js
var id = btn.getAttribute("data-id");
```

### 11.8 Privacy Pattern

**📌 Split RSVP views by audience**
```
Public:  "👥 Who's Going? (5)"  → shows u/username only
Mod:     "👥 View Attendees"    → shows u/username + email + phone + CSV export
```
Email/phone are ONLY shown in Mod Dashboard. Public view shows only Reddit usernames.

---

## 12. Meetit Production Patterns (Final Session)

### 12.1 Redis Write Verification Logging

**📌 Verify every Redis write with an immediate read**
Every `hSet`, `hDel`, `zAdd`, `zRem` call should be followed by a verification read. This catches silent failures:
```ts
await redis.hDel("key", [field]);
const stillThere = await redis.hGet("key", field);
console.log(`removed=${!stillThere}${stillThere ? " ⚠️ FAILED!" : ""}`);
```
Without verification, the `hDel` array-format bug would have gone unnoticed indefinitely.

**📌 `hDel` requires array format — confirmed by verification**
```ts
// ❌ Silent failure — event stays in pending forever
await redis.hDel("meetit:pending_events", eventId);
// ✅ Works — verified by immediate hGet read
await redis.hDel("meetit:pending_events", [eventId]);
```
This was the root cause of the "last event stuck in pending" bug. Every other delete handler already used array format — only the approve handler had the single-string variant.

**📌 `zAdd` verification confirms RSVP writes**
```ts
await redis.zAdd(key, { score: Date.now(), member: username });
const verifyScore = await redis.zScore(key, username);
console.log(`[RSVP] score=${verifyScore} | email=${!!email} phone=${!!phone}`);
```

### 12.2 Client-Side Action Guards

**📌 `actionInProgress` global lock prevents double-taps**
DOM-based button disabling (opacity + pointer-events) isn't fast enough on mobile Reddit app. A 500ms global lock that blocks ALL actions is more reliable:
```ts
var actionInProgress = false;
async function approveEvent(id: string) {
  if (actionInProgress) return;
  actionInProgress = true;
  // ... action ...
  setTimeout(function () { actionInProgress = false; }, 500);
}
```

**📌 `prefillLoading` guard prevents parallel API fetches**
When a user rapidly opens/closes the event form, `prefillOrganizer()` fires multiple times. Without a guard, each call starts a new `/api/init` fetch before the first one completes:
```ts
var prefillLoading = false;
async function prefillOrganizer() {
  if (usernameCached) { /* use cache */ return; }
  if (prefillLoading) return; // Prevent parallel
  prefillLoading = true;
  // ... fetch ...
  prefillLoading = false;
}
```

### 12.3 Mod Dashboard Patterns

**📌 Visual loading feedback (grey out + disable tabs)**
Replace blocking debounce locks with visual feedback:
```ts
function setModLoading(loading: boolean) {
  container.style.opacity = loading ? "0.4" : "1";
  tabs.style.pointerEvents = loading ? "none" : "auto";
}
```
This communicates "work in progress" without blocking user intent.

**📌 Stay on tab after action**
After approving the last event in pending, DON'T auto-switch to published tab. Stay on pending so the user sees the empty queue and knows they're still on the right tab. User switches manually.

### 12.4 UX Patterns

**📌 RSVP and Leave both return to home**
After RSVP confirmation or leaving an event, close the details overlay and go back to the home page. Don't re-open the event details. Consistent return-to-home behavior.

**📌 Empty state with CTA**
When the events list is empty, show a cat emoji with a pitch idea button:
```html
<div class="empty-state">
  <span class="emoji">🐱</span>
  <h2>Wow, so empty!</h2>
  <p>Switch to ✨ Create tab to pitch an idea</p>
  <button>💡 Pitch an Idea</button>
</div>
```

### 12.5 CRON Notification System (Final State)

**Working:**
- CRON fires every 5 minutes, scans active events
- Creates reminder posts (`submitCustomPost`) for events within 24h
- Detects new pending items since last check
- Creates alert posts as fallback when DM fails

**Not working (Devvit Web limitation):**
- `sendPrivateMessage` to individual users fails with `ERR_INVALID_ARG_TYPE`
- `sendPrivateMessage` to `/r/subreddit` (modmail) **WORKS from CRON** ✅ — mod alerts received as of 2026-05-27
- `submitComment` fails from all contexts
- `modMail.createConversation` not available in Devvit Web

**Hybrid architecture:**
```
Beautiful UI (Devvit Web) → Users interact with events, RSVPs, forms
CRON (*/5 min)            → Background: reminder posts, alert posts, DM attempts
Redis                     → Shared data between both
Mod Dashboard             → In-app notification center for mods
```

### 12.6 Date/Time Validation

**📌 Simple regex validation in form multi-step**
```ts
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showToast("Date must be YYYY-MM-DD", "error"); return; }
if (!/^\d{2}:\d{2}$/.test(time)) { showToast("Time must be HH:MM (24h)", "error"); return; }
```
Validate on each step transition, not on final submit. Catches errors early.

### 12.7 My Stuff Status Tracking

**📌 Server marks each event with `status: "pending"` or `status: "published"`**
Don't rely on client-side ID prefixes (`event_` vs other) to determine status. The server checks `pending_events` vs `active_events` hashes and attaches the status field to each event before sending to client.

### 12.8 V1.0 Final Patterns

**📌 Distributed lock on approve via `hSetNX`**
Prevent double-approve race conditions server-side, even if the client guard misses:
```ts
const lockAcquired = await redis.hSetNX(`meetit:approve_lock:${eventId}`, "status", "approving");
if (!lockAcquired) { console.log("Already being approved"); return { success: true }; }
await redis.expire(lockKey, 10); // 10s TTL prevents deadlock
```
More reliable than client-side `actionInProgress` flag alone.

**📌 Optimistic RSVP updates**
Show success toast immediately, close overlays, return to home — all before the API call completes. Fire fetch in background. On failure, show error toast:
```ts
showToast("RSVP confirmed!", "success");
closeOverlay("rsvp-overlay"); closeOverlay("details-overlay"); showHome();
fetch("/api/rsvp", {...}).catch(() => showToast("Failed - retry", "error"));
```
This removes the perceived latency of RSVP confirmation.

### 12.8 Manual Mod Whitelist via Settings (Reliable)

**📌 When `getModerators()` fails, let mods self-configure**
Added a `mod_usernames` settings field (comma-separated string). Mods enter their usernames in the Developer Portal settings. `isMod()` reads this settings field:
```ts
const modList = await settings.get("mod_usernames");
if (modList) {
  return (modList as string).split(",").map(s => s.trim().toLowerCase())
    .includes(username.toLowerCase());
}
return true; // No list configured → open to everyone (first install)
```
This is 100% reliable — no API dependency, no Redis cache, no trigger context limitations. Works in Devvit Web, playtest, and production identically.

### 12.10 Expanded Mode: Not for Complex Overlay-Based Apps (Failed Experiment)

**📌 `requestExpandedMode()` is Reddit's recommended pattern — but incompatible with overlay DOM architectures**

Games (Pixelary, Phaser) and chat apps (Community Chats) use it because they render one canvas/chat view. Our app has 6+ overlays (details, pitch, submit event, RSVP, My Stuff, mod dashboard) — all DOM elements that are destroyed when inline HTML is replaced, or hidden when visibility is toggled.

**Why it failed:**
- **innerHTML approach:** Replacing the container destroys all overlay/mod elements. When expanded mode loads, `document.getElementById("details-overlay")` returns null.
- **Visibility toggle approach:** Elements survive but CSS classList states are lost (`.active` on hidden overlays, tab highlights). The app loads in an inconsistent state.
- **entrypoint mismatch:** `default` → inline preview, `app` → expanded. Both load `app.html` with different DOM expectations.

**Lesson:** `requestExpandedMode()` works for apps where the inline and expanded views share no DOM. If your app has persistent UI elements that survive across view mode transitions, use scroll buttons instead.

**Our solution:** Multi-step forms (2 fields/step) + smart scroll buttons (auto-hide, 30px granular). This works reliably on all platforms and survived 50+ builds without regression.

**📌 Never delete server code that lives near helper functions without checking dependencies**
Deleting "dead" functions (`onSendReminders`, `onSendEventAnnouncement`, `notifyMods`) also deleted `writeJSON`, `readJSON`, `readRaw` — fundamental plumbing. App crashed completely with `ReferenceError: writeJSON is not defined`.

**📌 Safe approach: one edit, one build, one test**
Apply ONE change → build → verify. Never batch-delete blocks that span multiple function boundaries. Search for references before touching any function.

**📌 Incremental fixes that worked:**
- CRON flag order swap (2 lines)
- rAF cancel on close (1 line added)
- Input validation (3 lines per handler, no deletions)
- Organizer normalization (local variable + regex match)

### 12.9 Devvit Web API Discovery: sendPrivateMessage (2026-05-27) ⭐

**`reddit.sendPrivateMessage()` now works for subreddit modmail from CRON context.**

Previously documented as "fails from all contexts." The `other/codex` agent added the `submittedAt` timestamp field to pending events and pitches, enabling the CRON scheduler to detect new items. The notification code sends:
```ts
await reddit.sendPrivateMessage({
  subject: `Meetit: ${newItems} new item(s) await review`,
  text: `There are ${newItems} new pending event(s) or pitch(es) to review...`,
  to: `/r/${context.subredditName}`  // ← modmail to sub mods
});
```

**Confirmed working** (2026-05-27): Mod received "There are 2 new pending event(s) or pitch(es) to review. Open the Meetit app in r/meetup_hub2_dev to manage them."

Key insight: `to: /r/<subreddit>` (modmail) works, but `to: <username>` (individual DM) still fails. The platform distinguishes between subreddit-level messaging and user-level messaging in CRON contexts.

**Implications:**
- ✅ Mod alerts via modmail — sustainable notification channel
- ✅ `reddit.submitCustomPost` from CRON — works (creates alert posts as fallback)
- ❌ Individual user reminders via DM — still broken
- ❌ `reddit.submitComment` — still broken from all contexts

### 12.10 No Vertical Scrolling — Multi-Card Overlay Pattern (2026-05-30)

**Problem:** Devvit Web inline webview has no page-level vertical scroll on mobile. The 3-card detail overlay had organizer, description, map, and attendees all crammed into card 2 — long content overflowed the viewport with no way to scroll.

**Solution:** Split into 4 cards, each filling the full overlay body (`height:100%`). Individual content areas that might overflow (description, attendee list) get `flex:1; min-height:0; overflow-y:auto` — they scroll internally while the card itself stays fixed.

**Card layout after redesign:**

| Card | Content | Scrolling |
|------|---------|-----------|
| 1 | Date, Time, Location, RSVP count | None (always fits) |
| 2 | Organizer + Description (truncated with Read More toggle) + Map link | Only description box scrolls |
| 3 | "Who's Going?" attendee list + Load button | Only attendee list scrolls |
| 4 | RSVP / Leave action | None (always fits) |

**Key decisions:**
- Overlay body is `overflow:hidden` — each card handles its own internal overflow
- Description box: `flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch`
- Attendee list box: same pattern, fills remaining card height
- Attendees preload in background (`loadPublicAttendees`) when overlay opens — card 3 data is ready before user navigates there
- RSVP button moved from overlay footer into card 4 (footer now only has Back/Next nav)
- Removed 4th overlay-footer elements (`#detail-rsvp-btn`, `#detail-rsvped`) since RSVP UI lives in card 4 now

### 12.11 Race Condition Guard — Load Sequence Counter (2026-05-30)

**Problem:** When `loadHome()` is called multiple times rapidly (e.g., after RSVP, leave, or navigation), a slower response could overwrite data from a faster, newer request. This caused stale data flickers.

**Solution (from codex agent):**
```javascript
var homeLoadSeq = 0;

async function loadHome() {
  var loadSeq = ++homeLoadSeq;
  // ... fetch ...
  if (loadSeq !== homeLoadSeq) return; // bail — newer request in flight
  // ... render only if still latest ...
}
```

Pattern: increment a global counter before fetch, check it after every `await`. If the counter changed, a newer `loadHome()` started — discard this stale response.

Applied at multiple checkpoints: after fetch, after JSON parse, and before `setTimeout` render.

### 12.12 Stale Response Guard — showEventDetails (2026-05-30)

Two guards added to `showEventDetails()`:
1. **`detailLoading` flag:** `if (detailLoading) return` — blocks concurrent detail requests from rapid "View Details" taps. Reset on both success and failure paths.
2. **`currentEventId === id` check:** After server fetch completes, verifies user hasn't navigated to a different event in the meantime. Discards stale detail data.

Combined with the cache-first approach (open overlay instantly from `cachedHomeEvents`, then fetch server data), this eliminates flicker from stale responses.

### 12.13 Duplicate Button Binding — bindButtons Audit (2026-05-30)

**Bug:** `btn-load-attendees` was bound twice in `bindButtons()` — once at the mod-section bindings area and again at the detail-nav area. This meant every click triggered two fetches and two DOM updates.

**Root cause:** When adding the new binding during 4-card redesign, the old binding was left in place. `querySelectorAll` + `forEach` pattern silently allows duplicates.

**Lesson:** Audit `bindButtons()` for duplicate selectors after any refactor that moves button classes. Better yet, long-term: use event delegation (one listener on a parent element) instead of individual bindings.

### 12.14 Deploy & Monitor Commands (2026-05-30)

```bash
# Deploy: bump patch version + copy-paste install on playtest sub
devvit-cli upload --bump patch --copy-paste

# Monitor: tail logs from playtest subreddit
devvit-cli logs r/meetup_hub2_dev
```

Unlike `npm run deploy` which does `devvit upload` only, `devvit-cli upload --bump patch --copy-paste` bumps the version and offers copy-paste installation. The `devvit-cli logs` command provides real-time log streaming for debugging.

### 12.15 iOS Safari Flex + height:100% Bug (2026-05-30)

**Bug:** On iOS Safari, elements with `height:100%` inside flex containers expand to fit their content instead of filling the parent. This caused the description text to push the "Read more" button below the card's `overflow:hidden` clip boundary on iOS, while Android rendered it correctly.

**Root cause:** iOS Safari resolves `height:100%` as `auto` when the parent element is a flex item with `flex:1` but no explicit `height` property. The chain was:
- `overlay-body` (flex:1, no explicit height)
- `detail-card` (height:100%) → iOS treats as auto → expands to content
- `desc-box` (flex:1) → expands with parent
- `desc-track` (height:100%) → also expands
- Text fills the expanded area, "Read more" button pushed below clip boundary

**Fix:** Replace `height:100%` on detail cards with `position:absolute; top:0; left:0; right:0; bottom:0`. This locks the card to the `overlay-body` bounds regardless of flex resolution. The `overlay-body` gets `position:relative` to establish the positioning context.

**Pattern for all scrollable tracks:**
```css
/* Container */
position: relative;
overflow: hidden;

/* Track (horizontal slide container) */
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
```

This pattern was applied to:
- Detail overlay cards (all 4 steps)
- Description track (detail card 2)
- Attendee track (detail card 3)
- Mod dashboard description tracks

**Lesson:** When building for iOS Safari, never rely on `height:100%` inside flex containers. Use absolute positioning to lock elements to their parent bounds. Test on both iOS and Android after every UI change.

### 13.0 Cross-Platform Requirement (2026-05-30)

**Rule:** All UI changes must work on both iOS and Android. Test on both platforms after every commit.

**iOS Safari quirks to watch for:**
- `height:100%` inside flex containers → use `position:absolute` instead
- `-webkit-line-clamp` may not work reliably → add `max-height` fallback
- `overflow-y:auto` inside flex may expand instead of scroll → lock with absolute positioning
- Touch events can fire multiple times → use loading guards and disabled attributes
- `-webkit-overflow-scrolling:touch` can cause expansion → combine with absolute positioning

**Testing checklist:**
1. Deploy to playtest sub
2. Test on iOS device (iPhone/iPad)
3. Test on Android device
4. Verify all overlays open/close correctly
5. Verify horizontal pagination works (description, attendees, mod cards)
6. Verify buttons are visible and clickable
7. Verify no content overflow or clipping

### 14. Event Delegation vs Direct Listeners — Double-Fire Bug (2026-06-03)

**Bug:** Mod dashboard description pagination (Prev/Next) was skipping pages — clicking Next once would advance 2 pages instead of 1.

**Root cause:** Two event listeners were firing on every click:
1. The **event delegation** system (`handleAction` via `data-action` on `document.body`) — the primary handler
2. **Direct `addEventListener`** calls in `bindModDescNav()` — attached to individual Prev/Next buttons

When a user clicked "Next →", both handlers fired: `bindModDescNav`'s direct listener incremented the page index, then `handleAction` incremented it again. Result: double-increment, skipping pages.

**Fix:** Removed `bindModDescNav()` entirely. All navigation is now handled through the single event delegation dispatcher (`handleAction`). The `buildModDescNavHTML()` function only generates the HTML with `data-action` attributes; it no longer attaches direct listeners.

**Lesson:** When using an event delegation pattern (`data-action` + single `document.body` listener), never add direct `addEventListener` calls on the same elements. Pick one pattern and stick with it throughout. Mixing them causes silent double-fires that are hard to diagnose because both handlers look correct in isolation.

### 15. Per-Instance Pagination Lock Pattern (2026-06-03)

**Bug:** After removing the direct listeners, rapid clicking on Prev/Next could still cause skipped pages or out-of-bounds states due to touch event edge cases (iOS double-tap, fast repeat clicks).

**Fix:** Added a per-instance action lock in `handleAction`:

```javascript
case "mod-desc-next": {
  var lockKey = "mod-desc-" + id;
  if (isLocked(lockKey)) return;
  lock(lockKey);
  // ... increment, re-render ...
  setTimeout(function() { unlock(lockKey); }, 300);
} break;
```

**Key pattern details:**
- Lock key includes the item ID: `"mod-desc-" + id` — so navigating one card's description doesn't block another card
- `setTimeout(unlock, 300)` — 300ms is long enough to suppress rapid double-taps but short enough that users don't notice
- Unlock happens on both success and early-return paths (e.g., `if (c5 >= total) { unlock(); return; }`)

**Lesson:** Per-instance locks (keyed by item ID) are better than global locks for pagination — they prevent cross-card blocking while still protecting against rapid-fire on a single card. Always unlock on early-return branches to avoid stuck locks.

### 16. Mod Card Layout — Feature-Based Conditional Rendering (2026-06-03)

### 17. Date Validation — Past Events Rejected on Submit (2026-06-05)

**Bug:** Users could submit events with dates in the past. These events would immediately disappear from the home page (filtered by `getActiveEvents()`) but still exist in Redis, confusing users.

**Fix:** Client + server validation on `/api/submit-event` and `/api/approve-event`:

```ts
// Server (server.ts)
const today = new Date().toISOString().split("T")[0];
if (date < today) {
  return { type: "error", message: "Event date cannot be in the past" };
}
```

Client also validates before submit:
```javascript
var today = new Date().toISOString().split("T")[0];
if (date < today) { showToast("Date cannot be in the past", "error"); return; }
```

**Lesson:** Validate at BOTH client and server. Client prevents the round-trip, server is the security boundary.

### 18. User Cancel/Delete Their Own Events (2026-06-05)

**Feature:** Users can now cancel their pending events and delete their published events from "My Stuff" tab.

**Implementation:**
- My Stuff shows `❌ Cancel` button for `status === "pending"` events
- My Stuff shows `🗑️ Delete` button for `status === "published"` events
- Calls `/api/delete-pending` or `/api/delete-published` with `{ eventId }`

**Server authorization — owner-or-mod pattern:**
```ts
async function onDeletePending(req) {
  const { eventId } = readJSON(req);
  const ownerCheck = await isSubmissionOwner("meetit:pending_events", eventId);
  if (ownerCheck) return ownerCheck; // owner can delete
  return await requireMod(); // non-owner must be mod
}
```

**Lesson:** Two-tier auth — owner gets automatic access, non-owners require mod role. This prevents users from deleting other users' events while allowing mods to clean up anything.

### 19. Mod Dashboard Past Event Visibility Bug (2026-06-05)

**Bug:** After an event's date passed, it vanished from the mod dashboard's "Published" tab. Mods could no longer view RSVPs, manage, or delete past events.

**Root cause:** `onAllApprovedEvents()` used `getActiveEvents()` which filters `date < today`:
```ts
// ❌ WRONG - mods can't see past events
const events = await getActiveEvents();
```

**Fix:** Split into two functions:
```ts
// Public home page — ONLY future/current events
async function getActiveEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map(v => JSON.parse(v));
  const today = new Date().toISOString().split("T")[0];
  return eventList.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

// Mod dashboard — ALL events (no date filter)
async function getAllApprovedEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map(v => JSON.parse(v));
  return eventList.sort((a, b) => a.date.localeCompare(b.date));
}
```

**UI addition:** Past events in mod dashboard show a grey **⏰ Past Event** badge so mods can distinguish them.

**Lesson:** Different audiences need different data filters. The public view shows only actionable (future) events. The mod view shows ALL events for moderation, cleanup, and record-keeping. Never use the same filtered query for both.

### 20. Event Disappearance Mystery — Solved (2026-06-05)

**Report:** "Events disappearing automatically from the app after some time."

**Investigation:**
1. Checked CRON scheduler — does NOT delete events, only sends reminders
2. Checked delete endpoints — only triggered by explicit button clicks with confirmation dialogs
3. Checked `getActiveEvents()` — filters `date < today` from UI response

**Root cause:** User created events with yesterday's date. `getActiveEvents()` correctly filtered them out as past events. They still existed in Redis but were hidden from the UI.

**Resolution:**
- Not a real bug — the date filter was working as designed
- However, exposed the mod dashboard bug (Section 19 above) because mods couldn't see these "disappeared" events either
- Added date validation (Section 17) to prevent creating past events in the first place

**Lesson:** Before investigating "data loss", verify if it's actually filtering. Check Redis directly (`hGetAll`) vs the filtered API response. The data was never lost — it was just hidden by business logic.

### 21. Agent System Overhaul (2026-06-05)

**Change:** Replaced the single `planner` agent with an orchestrator + 5 specialized agents:

| Agent | Model | Role |
|-------|-------|------|
| `orchestrator` | kimi-k2.6 | Task planning, delegation, coordination |
| `general` | deepseek-v4-flash | Single-file edits, patterns, boilerplate |
| `coder_complex` | deepseek-v4-pro | Cross-file architecture, hard bugs, platform quirks |
| `search_docs` | qwen3.6-plus | Documentation lookup, Devvit API, web search |
| `git_commits` | deepseek-v4-flash | Commit messages, diffs, changelog |
| `documentation` | minimax-m2.5 | LEARNINGS.md, ADRs, devlog, session summaries |

**Files:**
- `~/.config/opencode/opencode.json` — global config with 6 agents + Stitch MCP
- `.opencode/opencode.json` — project-level overrides (deep-merges with global)
- `~/.config/opencode/prompts/*.md` — individual prompt files for each agent

**Deleted:** `~/.config/opencode/agents/planner.md`, `.opencode/agent/planner.md`

**Context:** Mod dashboard cards for pending/published/ideas tabs had accumulated UI cruft: every card showed the same action buttons regardless of context. Pending cards showed an "RSVPs" button even though no one RSVPs to pending events.

**Changes made:**

1. **Pending cards (`tab === "pending"`):**
   - Removed "RSVPs" button — pointless on pending events
   - Removed `border-top` separator line — cleaner look
   - Made **Approve/Decline** buttons full-width with `flex:1` — primary actions should dominate the card
   - Larger padding (`10px 12px` instead of `8px 16px`) — easier tap targets on mobile
   - Card nav (Prev/Next) also full-width `flex:1`

2. **Published cards (`tab === "published"`):**
   - Attendees and Delete buttons in horizontal flex row with `flex:1`
   - Attendee list `<div>` moved **inside** the published-only branch — no longer rendered for pending/ideas cards
   - Margin adjustments between button row and nav

3. **Ideas cards (`else`):**
   - Dismiss button `width:100%` instead of fixed padding
   - No attendees div (never needed for ideas)

**Lesson:** Conditional rendering should be feature-based, not one-size-fits-all. Each card state (pending/published/idea) has different user needs, and the UI should reflect that. Removing irrelevant buttons reduces cognitive load and makes primary actions more prominent. Use `flex:1` for action buttons in card footers to create balanced, full-width layouts on mobile.

### 22. Devvit v0.13 New Capabilities (May 2026)

**📌 Push Notifications (`@devvit/notifications` — experimental)**
```ts
import { notifications } from '@devvit/notifications';
await notifications.optInCurrentUser();
await notifications.enqueue({
  title: 'Your daily reward!',
  body: 'Come back and play',
  recipients: [{ userId: 'abc', data: { streak: '5' } }], // Mustache: {{streak}}
});
```
Rate limits: 2/user/day, 25K/app/day. Built-in opt-in/opt-out UX.

**📌 Realtime Pub/Sub (`realtime.send` / `connectRealtime`)**
Push live events from server to webview without polling:
```ts
// Server
await realtime.send(channel, msg); // No ':' in channel names

// Client
const conn = connectRealtime({ channel, onMessage });
```
**Note:** Removed from `@devvit/public-api` (Blocks API). Only available in `@devvit/web` (Devvit Web).

**📌 Second-Level Cron (experimental)**
6-part cron expression for per-second granularity: `*/30 * * * * *` = every 30 seconds.

**📌 Media Uploads**
```ts
import { media } from '@devvit/web/server';
await media.upload({ url: 'https://...', type: 'image' }); // PNG/JPEG/WEBP/GIF, 20MB max
```

**📌 Share Sheets (client-side)**
```ts
import { showShareSheet } from '@devvit/web/client';
showShareSheet({ title: 'My Score', text: 'I scored 9000!', data: 'abc' });
```

**📌 Streak System (Redis bitmap-based)**
1 bit per day, 365 bits/year (~46 bytes). Cross-year continuity:
```ts
await redis.bitField(`streak:${userId}:2026`, [
  { operation: 'SET', encoding: 'u1', offset: dayOfYear },
  { operation: 'GET', encoding: 'u1', offset: 0 },
]);
```

**📌 Post Styles**
```ts
await reddit.submitCustomPost({
  styles: { backgroundColor: { light: '#FFF', dark: '#000' } }
});
```

### 23. External Resources

**📌 `devvit-for-noobs` — Community Knowledge Base**
Comprehensive reference maintained by the community:
https://github.com/darelphilipo/devvit-for-noobs/blob/master/skills.md

Covers:
- 30+ production app patterns (bot-bouncer, only-flairs, user-scorer, mod-mentions, admin-tattler, etc.)
- Architecture decision tree (mod tool vs game vs notification bot)
- File organization patterns (single-file, 6-file, full client/server, monorepo)
- Redis patterns (TTL scheduler, modlist CSV, hash-per-field, capped arrays, ZSET queues)
- Scheduler patterns (self-chaining, randomized cron, dual scheduling, ZSET cleanup)
- Settings & configuration with validators
- Production library stack (Hono, Tailwind 4, Framer Motion, Lucide React)
- Devvit v0.13 changelog

**When to use:**
- Looking for a pattern from a specific app (e.g., "How did bot-bouncer handle rate limiting?")
- Choosing between architecture approaches
- Finding production-grade library recommendations
- Understanding new Devvit features before official docs are complete

---

## 24. Security & Privacy Patterns (2026-06-05)

### 24.1 PII Data Cleanup on Leave/Delete (C1)

**Bug:** When a user left an event, their email/phone contact info persisted forever in `meetit:rsvp_details:{eventId}` hash. When a mod deleted an event, the entire RSVP sorted set and contact details hash remained in Redis indefinitely.

**Fix:**
```ts
// onLeaveEvent: remove user from both RSVP set AND contact hash
await redis.zRem(`meetit:rsvps:${eventId}`, [username]);
await redis.hDel(`meetit:rsvp_details:${eventId}`, [username]); // ← added

// onDeletePublished: delete all RSVP data for the event
const members = await redis.zRange(`meetit:rsvps:${eventId}`, "-inf", "+inf", { by: "score" });
if (members.length > 0) await redis.zRem(`meetit:rsvps:${eventId}`, members.map(m => m.member));
const detailFields = await redis.hKeys(`meetit:rsvp_details:${eventId}`);
if (detailFields.length > 0) await redis.hDel(`meetit:rsvp_details:${eventId}`, detailFields);
```

**Lesson:** Anytime you store PII (email, phone) in a companion hash keyed by user ID, you MUST clean it up when:
- The user leaves/removes themselves
- The parent entity (event) is deleted
- The user's account is deleted (if applicable)

Redis hashes don't auto-expire or cascade-delete. Explicit cleanup is required.

### 24.2 Double-Submit Prevention with Per-Action Locks (C2)

**Bug:** Rapid double-tap on "Submit Idea", "Submit Event", or "RSVP" created duplicate records because IDs were generated client-side with `Math.random()` and there was no lock.

**Fix:** Added `isLocked()` / `lock()` / `unlock()` guards:
```ts
async function submitPitch() {
  if (isLocked("submit-pitch")) return;
  lock("submit-pitch");
  // ... validation ...
  try {
    await fetch("/api/pitch-idea", {...});
  } finally {
    unlock("submit-pitch"); // always unlock, even on error
  }
}
```

**Lesson:** Every destructive or write action needs a lock. The lock should be released in `finally` so early returns and errors don't leave the UI permanently disabled.

### 24.3 Validate Event Existence Before Writing (C6)

**Bug:** `onRsvp` accepted any `eventId` and wrote RSVP data to Redis even if the event didn't exist. A crafted POST could fill Redis with garbage data.

**Fix:**
```ts
async function onRsvp(req) {
  const { eventId } = readJSON(req);
  const event = await getActiveEvent(eventId);
  if (!event) return { error: "Event not found", status: 404 };
  // ... proceed with RSVP
}
```

**Lesson:** Never assume the client sends valid IDs. Always verify the referenced entity exists before performing operations on it. This prevents both data corruption and potential abuse.

### 24.4 Return 404 for Missing Entities (C7)

**Bug:** `onApproveEvent` returned `{ success: true }` even when the event ID didn't exist in `pending_events`, because the `if (eventJson)` block was skipped silently.

**Fix:**
```ts
async function onApproveEvent(req) {
  const eventJson = await redis.hGet("meetit:pending_events", eventId);
  if (!eventJson) {
    return { error: "Event not found in pending queue", status: 404 };
  }
  // ... proceed with approval
}
```

**Lesson:** When a resource is not found, return an explicit error (404) instead of silently succeeding. Silent success misleads the user and hides bugs.

---

## 25. UI/UX Polish Patterns (2026-06-05)

### 25.1 Backdrop Click to Close Menus (C3/Q1)

**Bug:** The create menu's dark backdrop was a dead click zone. Users had to tap the ✨ button again to close the menu.

**Fix:** Added `data-action` to the backdrop element:
```html
<div class="backdrop" id="create-backdrop" data-action="close-create-menu"></div>
```

And handled it in the event delegation dispatcher:
```ts
case "close-create-menu": closeCreateMenu(); break;
```

**Lesson:** Any overlay, menu, or modal should close when tapping outside it. Use `data-action` on the backdrop to delegate the close action without adding individual listeners.

### 25.2 Button State Reset on Overlay Open

**Bug:** The "Update Contact" button appeared blank because `showRsvpOverlay()` set the button text, then called `setBtnLoading(..., false)` which restored `dataset.originalText` — but `dataset.originalText` was deleted on the previous close, so it restored `""` (empty string).

**Fix:** Manually reset button state instead of using `setBtnLoading()`:
```ts
function showRsvpOverlay(id, email?, phone?) {
  // ... set text ...
  var btnEl = document.querySelector(".btn-submit-rsvp");
  if (btnEl) {
    btnEl.textContent = email !== undefined ? "Update →" : "Confirm RSVP →";
    btnEl.style.opacity = "1";
    btnEl.style.pointerEvents = "auto";
    (btnEl as any).disabled = false;
    delete btnEl.dataset.originalText;
  }
}
```

**Lesson:** `setBtnLoading()` stores/restores `dataset.originalText` for loading state management. If you change button text after a load operation, either reset `dataset.originalText` first, or bypass `setBtnLoading()` and manually set the styles.

---

## 26. Future Enhancement Backlog (2026-06-05)

### P1: Client Success Toast Fires Even on Server Rejection

**Observation:** RSVP, pitch, and event submit paths do not check `res.ok` or server error JSON before showing success. A rejected past-date event, invalid server-side validation, or auth failure can appear successful to the user.

**Affected lines in `src/client/app.ts`:**
- `submitEvent` — line 1032: shows "Event submitted! ✅" before checking server response
- `submitPitch` — line 1014: shows "Idea sent! ✅" before checking server response
- `submitRsvp` — line 1039: shows "RSVP confirmed!" before checking server response

**Fix pattern (already applied elsewhere):**
```ts
var res = await fetch(endpoint, { ... });
if (res.ok) { showToast("Success!", "success"); }
else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
```

### ~~P2: Reminder Timing Assumes UTC (Incorrect for Local Times)~~ ✅ FIXED

**Observation:** The scheduler built `new Date(event.date + "T" + event.time + ":00Z")` in `src/server/server.ts`. Meetup times are typically local to the subreddit/community. Reminders could fire hours early or late.

**Fix (2026-06-07):**
- Added `timezone` as a `select` setting in `devvit.json` (type `"select"`, not `"string"`) with 8 common timezone options
- Default: `"+05:30"` (IST, India)
- Other options: US East (-5), US West (-8), UK (+0), Central Europe (+1), Japan (+9), Australia (+11), UTC
- `AppSettings` now includes `timezone: string`
- `getSettings()` reads the timezone from `settings.get("timezone")` with `"+05:30"` fallback
- CRON `onCheckEvents()` reads the timezone once per run, parses the offset string into `tzSign` + `tzValue`, then constructs `new Date(date + "T" + time + ":00" + tzOffset)` instead of hardcoded `"Z"`
- This ensures `Date.now()` (server UTC) is compared against the correct local event time
- The `select` setting type is fully supported in `devvit.json` schema — confirmed via `config-file.v1.json` `$defs.SelectSetting`

### P2: Public Post Fallback for Mod Alerts

**Observation:** When the CRON scheduler detects new pending items and mod messaging fails, it creates a public `submitCustomPost` in `src/server/server.ts:753-760`. For a meetup organizer tool, review-queue alerts should not become public subreddit posts by default.

**Potential approaches:**
- Remove the `submitCustomPost` fallback entirely (let mods check manually)
- Or gate it behind an opt-in setting
- Or send to a mod-only wiki page instead of a public post

---

## 27. UI Debug Panel: Copy All Logs

**Added:** 2026-06-07

**Problem:** During manual testing, the debug panel only showed the last 50 entries and had no way to export them. Users had to screenshot or manually transcribe logs.

**Solution:**
- Added a sticky header bar inside `#debug-panel` with a "📋 Copy All" button
- `copyAllLogs()` function extracts all `.log-entry` elements, reverses them (oldest first), and copies to clipboard
- Uses same clipboard pattern as Share/Copy Link: `navigator.clipboard.writeText()` with textarea fallback
- Prefixes copied text with `--- Meetit UI Log {ISO timestamp} ---`
- `fallbackCopyLogs()` handles iOS Safari where `navigator.clipboard` is unavailable
- Button uses `stopPropagation()` so clicking it doesn't bubble to panel toggle

**Files changed:**
- `public/app.html`: Added sticky header with copy button inside `#debug-panel`
- `src/client/app.ts`: Added `copyAllLogs()`, `fallbackCopyLogs()`, and event listener

---

## 28. Server Logging Audit & Gap Fixes

**Audit Date:** 2026-06-07

**Method:** Checked every server handler in `src/server/server.ts` for `console.log()` coverage.

**Gaps found and fixed:**

| Handler | Had Logs? | Fix |
|---------|-----------|-----|
| `onHome` | ✅ Yes | `[HOME] Loading events...` + `[HOME] Found N events` |
| `onEventDetails` | ✅ Yes | `[EVENT-DETAILS] eventId=...` |
| `onRsvp` | ✅ Yes | `[RSVP] username → eventId` |
| `onLeaveEvent` | ✅ Yes | `[LEAVE] Removing username from key` |
| `onPitchIdea` | ✅ Yes | `[PITCH] "title" by u/username` |
| `onSubmitEvent` | ✅ Yes | `[SUBMIT] "title" by username` |
| `onApproveEvent` | ✅ Yes | `[APPROVE] eventId` + lock status |
| `onDeletePending` | ✅ Yes | `[DEL-PEND] eventId` |
| `onDeletePublished` | ✅ Yes | `[DEL-PUB] eventId` + RSVP cleanup count |
| `onDismissIdea` | ✅ Yes | `[DISMISS] ideaId removed` |
| `onExportAttendees` | ✅ Yes | `[EXPORT] eventId | N attendees` |
| `onAllApprovedEvents` | ✅ Yes | `[ALL-APPROVED] Total approved...` |
| `onMySubmissions` | ✅ Yes | `[MY-SUBMISSIONS] pitches=N myEvents=N rsvps=N` |
| `onPendingEvents` | ❌ **NO** | Added: `[PENDING] N pending events` |
| `onPitchedIdeas` | ❌ **NO** | Added: `[PITCHES] N pitched ideas` |
| `onRsvpList` | ❌ **NO** | Added: `[RSVP-LIST] eventId | N attendees` |
| `onMyRsvp` | ❌ **NO** | Added: `[MY-RSVP] eventId | user=... | hasEmail | hasPhone` |

**Result:** Every API endpoint now has at least 1 server-side log line for traceability.

---

## 29. Manual Test Suite Created

**File:** `TEST_CASES.md`

**Contents:**
- 30+ manual test cases organized by module (A-J)
- Each test case includes: Preconditions, Steps, Expected Result, What to Capture
- Modules: Home, Event Details/RSVP, Create Event, Submit Pitch, My Stuff, Mod Dashboard, Share/Copy, Pagination, Edge Cases, CRON
- Quick Start checklist: 10 essential cases for minimal viable audit
- Log Tag Reference table mapping tags like `[RSVP]`, `[LEAVE]`, `[SUBMIT]` to server handlers

**How to use:**
1. Run test case in app
2. Tap 🐛 → 📋 Copy All to get UI logs
3. Capture Devvit CLI logs: `devvit-cli logs r/meetup_hub2_dev`
4. Paste both to me for analysis

---

## 30. Devvit `select` Settings Return `string[]`, Not `string`

**Discovery Date:** 2026-06-07 (found during Test 1 audit)

**Bug:** Devvit `type: "select"` settings return a `string[]` (array with one element: `["+05:30"]`), not a `string` (`"+05:30"`). Calling `.startsWith()` on the array throws:

```
[CRON] Error: TypeError: timezone.startsWith is not a function
```

**Root Cause:** Devvit's `SelectField` type has `BaseField<string[]>` — the selected value is stored as an array even for single-select fields. This is documented in `@devvit/shared-types/shared/form.d.ts`:

```typescript
export type SelectField = Prettify<BaseField<string[]> & ... {
    type: 'select';
    options: FieldConfig_Selection_Item[];
}>;
```

**Fix:** Added `normalizeTimezone()` helper that unwraps arrays:

```typescript
function normalizeTimezone(raw: unknown): string {
  if (Array.isArray(raw)) return (raw[0] as string) || "+05:30";
  return (raw as string) || "+05:30";
}
```

Applied in:
- `getSettings()` — reads `settings.get("timezone")` safely
- `onCheckEvents()` — reads timezone for CRON reminder timing

**Impact:** CRON was crashing every 5 minutes, preventing event reminders and mod alerts from firing.

---

## 31. Read-After-Write Checks Removed (2026-06-07)

**Audit finding:** Several endpoints still verified Redis writes with immediate reads and used the result for success/failure. Devvit Redis is eventually consistent, so these checks could return false negatives even when the write succeeded.

**Affected functions in `src/server/server.ts`:**
- `onSubmitEvent` — removed `const saved = !!(await redis.hGet(...))`
- `onDismissIdea` — removed `const ok = !(await redis.hGet(...))`
- `onDeletePending` — removed `const ok = !(await redis.hGet(...))`
- `onDeletePublished` — removed `const ok = !(await redis.hGet(...))`
- `onApproveEvent` — removed the `inActive`/`inPending` verification block

**Result:** All write handlers now return `success: true` based on the write call completing without exception. Logs still capture the operation for traceability.

---

## 32. Dead Code Using Broken Platform APIs (2026-06-07)

**Audit finding:** `notifyMods` and `onSendEventAnnouncement` both called `reddit.submitComment()` which is documented as broken in Devvit Web. They weren't wired in `devvit.json` but were still exported and reachable.

**Fix:**
- `notifyMods` → converted to safe no-op (logs a warning, returns early)
- `onSendEventAnnouncement` → removed entirely (not imported anywhere)
- `onSendReminders` → converted to safe no-op (it called `sendPrivateMessage({to: username})` which fails for individual users; the active CRON in `onCheckEvents` handles reminders via public posts)

**Lesson:** Dead code that calls broken APIs is a trap. Either remove it or make it a no-op with a clear log message. Never leave it looking functional.

---

## 33. Username Auth Gating on RSVP/Leave (2026-06-07)

**Audit finding:** `onRsvp` and `onLeaveEvent` used `context.username || ""` as fallback. If Devvit returned an empty username, multiple unauthenticated requests could collapse into the same RSVP member key (`""`), corrupting data.

**Fix:** Both endpoints now reject with `401 Authentication required` if `context.username` is empty:
```ts
const username = context.username;
if (!username) return { error: "Authentication required", status: 401 };
```

**Lesson:** Never use an empty string as a Redis member key. Either reject unauthenticated actions explicitly or generate a unique fallback (e.g., random ID). Empty keys are a data corruption risk.

---

## 34. Audit Results (2026-06-07)

### Test 1: Complete User Journey (Non-Mod) — ✅ PASS

Ran on `r/meetup_hub2_dev` as `u/darelphilip` with 7 active events.

| Step | Flow | Result | Key Log |
|------|------|--------|---------|
| 1.1-1.2 | Home + card nav (0→6 of 7) | ✅ | `[HOME] Found 7 events` |
| 1.3 | View details (4-step overlay) | ✅ | `[EVENT-DETAILS] eventId=...` |
| 1.5 | RSVP with email+phone | ✅ | `[RSVP] darelphilip → ... email=yes phone=yes` |
| 1.6 | Leave event | ✅ | `[LEAVE] Removing darelphilip...`, final `hasRsvped=false` |
| 1.7 | Submit event (4-step form) | ✅ | `[SUBMIT] "Testing new" ... \| id=... \| emoji=💻` |
| 1.8 | Submit pitch | ✅ | `[PITCH] "Ok I am going..."` |
| 1.9 | My Stuff (3 tabs) | ✅ | `[MY-SUBMISSIONS] pitches=5 myEvents=13 rsvps=4` |
| 1.10 | Cancel pending event | ✅ | `[DEL-PEND] removed`, `myEvents` 13→12 |

**Verified fixes from this test:**
- RAW1: `[SUBMIT]` and `[DEL-PEND]` no longer show read-after-write boolean fields
- CRON: No `timezone.startsWith is not a function` error
- CRON: Mod alerts sent via modmail + reminder posts created
- AUTH1: RSVP/Leave with valid `context.username` works normally
- BTN1-5: No stuck/blank button states reported

### Test 2: Mod Full Cycle — ✅ PASS

| Step | Flow | Result | Key Log |
|------|------|--------|---------|
| 2.1 | Open mod dashboard | ✅ | `[PENDING] 2`, `[ALL-APPROVED] 10` |
| 2.2 | Card nav (10 rapid taps) | ✅ | No double-increment, no skipped pages |
| 2.4 | Approve pending event | ✅ | `[APPROVE] Nnznsm approved`, pending 2→1, approved 10→11 |
| 2.5 | Dismiss pitch | ✅ | `[DISMISS] removed`, pitches 5→4 |
| 2.6 | Export CSV | ✅ | `[EXPORT] ... \| 1 attendees \| by darelphilip` |
| 2.7 | Delete published event | ✅ | `[DEL-PUB] removed \| rsvp_members=1`, approved 11→10 |

**Verified fixes from this test:**
- RAW1: `[APPROVE]`, `[DISMISS]`, `[DEL-PUB]` log formats simplified (no boolean verification fields)
- C11: Rapid-pagination on mod cards no longer double-increments
- C1: Delete event logs `rsvp_members=N` confirming RSVP data cleanup
- Mod tab caching works (`loadModTab using cache`)

### Test 3: Validation & Edge Cases — 🔶 BUG FOUND + FIXED

**Bug discovered:** Dismiss pitch showed success but pitch still appeared — caused by stale `modTabCache` not being invalidated + missing lock guard. Fixed in section 35.

**Validated:**
- CRON healthy (no timezone crash)
- Empty state renders when all events/pitches deleted
- Fresh pitch submission appears in mod dashboard

**Skipped:** Client-side validation tests (invalid email, past date, category required, double-submit, optional RSVP fields, lock verification)

---

## 35. DismissIdea Stale Cache + Missing Lock (2026-06-07)

**Bug discovered during Test 3:** Dismissing a pitch showed success toast but the pitch still appeared in the mod dashboard. User dismissed the same idea 13 times before it finally disappeared.

**Root cause (two-fold):**

1. **Stale cache never invalidated:** `dismissIdea` called `loadModTab("pitches")` on success, but `loadModTab` has a 60-second cache (`modTabCache`). The cache was never deleted before reload, so it kept returning stale data showing the dismissed pitch.

2. **No double-tap lock:** `dismissIdea` had no `isLocked/lock/unlock` guard. Every other destructive action did. User could rapid-fire dismiss the same pitch repeatedly.

**Fix:**
```ts
async function dismissIdea(id: string) {
  var k = "dismiss-" + id;
  if (isLocked(k)) return;       // ← added
  lock(k);                        // ← added
  // ... confirm, fetch ...
  if (res.ok) {
    showToast("Idea dismissed", "success");
    delete modTabCache["pitches"];             // ← added (cache invalidation)
    setTimeout(function () { loadModTab("pitches"); }, 300);
  }
  // ...
  finally { unlock(k); }          // ← added
}
```

**Pattern audit:** Checked all 5 functions that call `loadModTab()`. `approveEvent`, `deleteEvent`, `showModDashboard`, and `switchModTab` already had proper cache invalidation + locks. Only `dismissIdea` was missing both.

**Lesson:** Any function that writes mod data to the server and then reloads a mod tab MUST:
1. Delete the corresponding `modTabCache[key]` before calling `loadModTab(key)`
2. Have an `isLocked/lock/unlock` guard to prevent rapid double-taps
3. Both are required — caching without invalidation causes stale UI; no lock allows duplicate requests

---

## 36. Production Smoke Test Results (2026-06-11)

Real user session logs from r/meetup_hub2_dev (user: darelphilip, mod role).

### ✅ What's Working Fine

| Feature | Evidence | Status |
|---|---|---|
| **Home event loading** | `[HOME] Found 4 events, isMod=true` — consistent across 8+ fetches | ✅ Stable |
| **Mod dashboard (all 3 tabs)** | Pending, Published, Pitches all load without errors | ✅ Stable |
| **Published event sorting** | `renderModPublished sorted 4 events by RSVP count` — most popular first | ✅ Working |
| **Card navigation (Prev/Next)** | `modNext tab=published`, `modPrev tab=published` — smooth transitions | ✅ Working |
| **Mod event details overlay** | `showModEventDetails id=...` — opens correctly | ✅ Working |
| **Debug panel + unified logs** | `debug panel visible` → `server logs merged: 100 entries, total=50` | ✅ Working |
| **Server log capture** | 100 server entries auto-captured in Redis, merged with client logs | ✅ Working |
| **My Stuff tab** | `openMyStuff` → `loadMySubmissions` → successful API call | ✅ Working |
| **Auth / username** | `darelphilip` correctly identified on every request | ✅ Working |
| **Timezone display** | `+05:30` suffix showing correctly on times | ✅ Working |

### ⚠️ Issues Found & Fixed

| Issue | Evidence | Fix |
|---|---|---|
| **Mod card borders overflow** | Screenshot shows card shadow cut off on right edge | Added `margin: 0 4px` to mod card inline style |
| **Long description overflow** | Very long descriptions could overflow horizontally | Added `word-break: break-word; overflow-x: auto` to detail overlay |
| **Attendee list overflow** | Long emails/usernames could break layout | Added `word-break: break-word` to all attendee entry divs |
| **Redundant home fetches** | 4 `/api/home` calls within 3 seconds (11:09:27–11:09:30) | Likely from rapid navigation + auto-refresh overlap; debounce exists but may need tuning |

### 🔧 Still Needs Work

| Issue | Priority | Notes |
|---|---|---|
| **Redundant API calls** | Medium | 4 home fetches in 3s suggests debounce isn't catching rapid switches. May need to increase debounce window or add request deduplication |
| **Event capacity (E1)** | High | No max attendees limit — could oversubscribe |
| **Edit event after submission (E2)** | High | Must delete+resubmit currently |
| **Push notifications (M4)** | Medium | Gated beta, requires approval form |
| **Attendee preview on home card (E3)** | Medium-High | Social proof — show "5 going" on home card |
| **Search/filter UI re-enable (E10)** | Low | Code exists, just hidden |

### 📊 Log Analysis Insights

**Server log volume:** 100 entries captured in ~1 minute of active use. Good coverage.

**Client log volume:** 50 unified entries. Merge deduplication working (no duplicate server entries).

**No errors in session:** Zero `[ERROR]` or `server error` entries. All API calls returned successfully.

**Mod features heavily used:** User tested all 3 mod tabs, card navigation, and detail overlays. No crashes.

### 🎯 Next Priority

1. **Deploy current fixes** (card margin, word-break, attendee overflow, redundant API calls, horizontal scrolling)
2. **Implement E1 (event capacity)** — prevents oversubscription, most requested mod feature
3. **Continue beta testing** — collect more logs, look for edge cases

---

## 37. Redundant API Call Fix & Horizontal Scrolling Overlays

### 37.1 Redundant API Calls

**Problem:** Logs showed 4 `/api/home` calls within 3 seconds during normal navigation. User wasn't spamming refresh — the app was firing duplicate requests.

**Root cause:** `loadHome()` had a 150ms debounce, but:
1. No flag to prevent concurrent in-flight requests
2. Multiple actions call `loadHome()` (submit pitch, submit event, refresh button, showHomePage)
3. Rapid navigation could queue overlapping fetches

**Fix:**
```typescript
var homeFetchInProgress = false;
var modFetchInProgress = false;
var DEBOUNCE_DELAY = 300; // increased from 150

async function loadHome() {
  if (homeFetchInProgress) { log("loadHome skipped: fetch already in progress"); return; }
  // ... debounce ...
  homeFetchInProgress = true;
  try { /* fetch */ }
  finally { homeFetchInProgress = false; }
}
```

Same pattern applied to `loadModTab()`.

**Result:** Only one fetch in flight at a time. Subsequent calls are skipped with a log entry.

### 37.2 Horizontal Scrolling Mod Overlays

**Problem:** Mod detail overlay and attendees overlay used vertical scrolling (`overflow-y: auto`), inconsistent with the home page's horizontal card-based navigation.

**Solution:** Redesigned both overlays to use the same horizontal track pattern as the home page.

**Mod Detail Overlay (3 pages):**
- **Page 1:** Event info — date, time, location, category, RSVP count badge (centered, emoji, clean layout)
- **Page 2:** Description — full text in scrollable container within the page
- **Page 3:** Actions — Copy CSV, Delete Event buttons

**Mod Attendees Overlay (paginated):**
- Attendees split into pages of 5
- Horizontal swipe between pages
- Page indicator: "12 Attendees — Page 2/3"
- Copy CSV button always visible at bottom

**Navigation pattern (same as home):**
```
[← Prev]  1/3  [Next →]
```

**CSS:**
- Track: `display:flex; width: N*100%; transition:transform 0.25s`
- Each page: `min-width:100%; height:100%`
- Navigation: `position:absolute; bottom:12px`

**Files changed:**
- `src/client/app.ts` — `showModEventDetails()`, `showModAttendees()`, `modDetailNext/Prev()`, `modAttNext/Prev()`, in-progress flags
- `public/app.html` — Removed `overflow-y:auto` from mod overlay bodies

### 37.3 Build Size Impact

- Before: 100.5kb
- After: 107.4kb (+6.9kb for horizontal overlay system + API deduplication)

Acceptable increase for major UX consistency improvement.

### 37.4 Flex Track Bug Fix

**Problem:** Mod detail and attendees overlays showed empty pages when using `display:flex` track with `transform:translateX`.

**Root cause:** When the overlay starts with `display:none`, the browser doesn't calculate flex dimensions. When it becomes visible, flex items with `min-width:100%` and `height:100%` don't recalculate correctly — some pages render with 0 dimensions.

**Fix:** Switched to absolute positioning for each page:
```
Each page: position:absolute; top:0; left:0; width:100%; height:100%
Offset: transform:translateX(N*100%) — slides pages horizontally
Visibility: opacity + visibility toggled for smooth transitions
```

**Why this works:** `position:absolute` with explicit `width:100%;height:100%` fills the parent regardless of when the overlay becomes visible. The transform is applied to each page individually, not to a track.

**Pattern:** For overlay "pages" that must work reliably:
- ❌ Don't use `display:flex` tracks inside overlays that start hidden
- ✅ Use `position:absolute` pages with `transform:translateX` offsets
- ✅ Toggle `opacity` + `visibility` for smooth transitions

### 37.5 Mod Detail Layout — Replicated Home Page Design

**Problem:** Mod detail overlay looked "empty and floaty" compared to the rich home page detail overlay.

**Root cause:** The mod detail overlay used a simple centered layout with minimal styling, while the home page uses a dense card-based design with borders, backgrounds, and rich content.

**Fix:** Replicated the exact home page detail overlay layout for mod view:

| Card | Home Page | Mod Detail |
|---|---|---|
| **1** | Quick Info (emoji, date, time, location, category, RSVP count) | Same — event info with RSVP badge |
| **2** | Organizer + Description (with pagination) | Same — organizer avatar + description |
| **3** | Who's Going (attendees with pagination) | Same — attendee list with pagination |
| **4** | RSVP / Leave | **Mod Actions** (Copy CSV, Delete Event) |

**Key design elements copied from home page:**
- `.detail-card` class: `background:#fff; border:var(--border); box-shadow:var(--shadow-sm)`
- Organizer avatar: 36px circle with initial letter
- Description box: white background, border, scrollable
- Attendee list: bordered container with pagination
- Consistent spacing, fonts, and colors

**Result:** Mod detail overlay now feels as rich and information-dense as the home page, with the same familiar navigation pattern.

## 38. Unified Card Shell UI Pattern (2026-06-13)

**Change:** Introduced a reusable card shell component used by Home, Mod Dashboard, and My Stuff browse/carousel views, matching the layout already proven in the Event Details overlay.

**Pattern:**
```
[fixed header]
[progress dots (item position)]
[full-viewport scrollable card body]
[fixed footer nav: Prev / Next]
```

**CSS classes:**
- `.card-shell`: `position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column;`
- `.card-shell-header`: `flex-shrink:0`
- `.card-shell-body`: `flex:1; min-height:0; overflow:hidden; position:relative; display:flex; flex-direction:column`
- `.card-shell-actions`: contextual action row between body and footer
- `.card-shell-footer`: fixed footer nav bar
- `.card-progress` / `.card-progress-dot` / `.card-progress-dot.done`: item position dots

**JS helpers:**
- `buildCardShell({color, headerHtml, bodyHtml, actionsHtml, footerHtml, className})`
- `updateCardDots(prefix, current, total)` updates `<div id="{prefix}-dots">`
- `updateCardNav(prefix, current, total)` shows/hides `<button id="{prefix}-prev-btn">` / `<button id="{prefix}-next-btn">`

**iOS Safari note:** The shell relies on absolute positioning (not `height:100%`) inside flex parents. The card body uses `display:flex; flex-direction:column` so internal scrollable regions can use `flex:1; min-height:0` instead of `height:100%`.

**Contextual actions preserved:**
- Home: View Details + RSVP/Going + Share
- Mod Pending: Approve + Decline
- Mod Published: View Details + Attendees + Delete
- Mod Pitches: Dismiss
- My Stuff RSVPs: Update Contact + Leave
- My Stuff Events: Cancel (pending) / Delete (published)
- My Stuff Pitches: Delete

**Logging:** Every changed path (render, nav, helper entry) gets a `log()` call per §0.2.

## 39. v1.4.0 Post-Release Refinements (2026-06-15)

After shipping the unified card shell, real-device testing surfaced four issues that the v1.4.0 release didn't fully address. Fixing them turned a "works" build into a "snappy and stable" build. This section captures the lessons so the next UI redesign doesn't repeat them.

### 39.1 Flex Layout Beats Magic `calc()` for Full-Viewport Cards

**Bug:** Home page card ended ~⅔ down the screen with empty white space below it, even though the card shell used `position:absolute;top:0;left:0;right:0;bottom:0`.

**Root cause:** `#events-container` was sized with `height: calc(100vh - 170px)` — a hard-coded magic number that underestimated the header height. The card shell expanded to fill that container, but the container itself was too short.

**Fix:** Replace the calc with a flex column:
```css
.container { display: flex; flex-direction: column; min-height: calc(100vh - 32px); ... }
#events-container { flex: 1; position: relative; min-height: 0; }
```

**Why it works:**
- `.container` is always at least viewport-height-minus-body-padding.
- `#events-container` flexes to fill the remaining space exactly, no matter how tall the header grows.
- `min-height: 0` on `#events-container` lets its child (the absolutely-positioned card shell) actually shrink-fit instead of expanding to intrinsic content height (the same iOS Safari flex trap from §21).

**Lesson:** Prefer flex columns over `calc(100vh - Npx)` for fill-the-remaining-space layouts. Magic numbers drift whenever the header changes.

### 39.2 Truncate User-Generated Metadata, Always

**Bug:** Mod Published tab pushed the "Delete Event" button off-screen when the event location was a long string ("Ok I can see 👀 in your the…").

**Root cause:** The metadata row `<div>📅 {date} at {time} · 📍 {location}</div>` had no width constraint, so the location wrapped to multiple lines and ballooned the header. With the header tall, the body + actions + footer no longer fit in the viewport, and the footer got pushed below the fold.

**Fix:** Two-step change:
1. Make the metadata row a flex container with `min-width:0` and wrap the location in a separate `<span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">`.
2. Truncate title to 2 lines with `-webkit-line-clamp:2` (already in place) and category chips to one line.

**Lesson:** Any text field that comes from user input must have a width constraint and a truncation strategy. The classic CSS flex trap: a flex child defaults to `min-width:auto` which means it will overflow rather than shrink. Always set `min-width:0` on the truncating child.

### 39.3 Scrollable Body Anchors Actions and Footer

**Bug:** The mod Published tab originally used a centered placeholder body (big emoji + title + "Tap an action below…"). The placeholder had no content scroll, so the card body filled with whitespace and the action buttons sat in the middle of the card instead of the bottom.

**Root cause:** The placeholder was `display:flex; justify-content:center; align-items:center` with no scrollable child. Combined with the card shell body's `flex:1`, the placeholder took all available space and pushed actions and footer down — but the actions/footer themselves were flex-shrink:0, so they eventually overflowed the bottom.

**Fix:** Use the same scrollable description box for all three mod tabs (Pending / Published / Pitches). The body now has bounded content that scrolls, which:
- Keeps the action row visually anchored right above the footer.
- Shows the actual event description in Published instead of a placeholder.
- Uses the same `splitTextToPages()` + nav pattern already proven in Event Details.

**Lesson:** In a flex card shell, the body should always be a real scrollable container, not an empty/placeholder region. If you don't have content for the body, render the description anyway — empty space below the header looks broken; scrolling content looks intentional.

### 39.4 Embed Progress Dots in the Card Header

**Bug:** Mod dashboard progress dots lived in a separate row between the tabs and the card body, wasting ~30px of vertical space on every mod card.

**Root cause:** The initial implementation used a standalone `<div class="card-progress" id="mod-dots">` injected between `#mod-tabs` and `#pending-events-container`. This pattern doesn't scale: every view that wants dots ends up adding another row.

**Fix:** Move dots into the card header as the last child. For Mod cards:
```ts
headerHtml += '<div class="card-progress mod-dots"></div>';
```
Then update `updateCardDots("mod", ...)` to find dots by class first, with an id-based fallback for Home/My Stuff:
```ts
var dots = document.querySelector(".card-progress." + prefix + "-dots") as HTMLElement | null;
if (!dots) { dots = document.getElementById(prefix + "-dots") as HTMLElement | null; }
```

**Why this is the right pattern:**
- Dots become part of the card's intrinsic vertical layout — no extra row overhead.
- The card shell is self-contained: `buildCardShell()` produces a complete card including dots, ready to drop into any container.
- Class-based selectors scale better than id-based when you have multiple cards in the DOM (e.g., a list view).

**Lesson:** When a piece of UI is conceptually part of a card, render it inside the card. Don't split a single visual unit across the overlay chrome and the card.

### 39.5 Version Hygiene: Tag + Release Notes Per Shipping Commit

**Practice:** After merging a feature/fix branch, immediately:
1. Create an annotated tag (e.g., `v1.4.0`).
2. `git push origin <tag>`.
3. `gh release create <tag> --title "..." --notes-file notes.md --latest`.
4. Reference the compare URL (`compare/v1.3.3...v1.4.0`) in the notes.

**Why:**
- The release page becomes the single source of truth for "what's in this version" — easier than `git log`.
- The `--latest` flag auto-promotes it as the current release; old releases stay accessible.
- The OpenSpec change task `5.4` can be marked complete with a note that it's "shipped to GitHub" (Devvit upload to the subreddit remains a separate, user-authorized step).

**Note for this project:** Devvit upload still requires OAuth authorization in a browser, which only the user can do. "Shipped to GitHub" is the highest level a build agent can reach. A separate `devvit-cli upload` step is needed to publish to r/meetup_hub2_dev.

### 39.6 From Here: UI Polish + Mod Features Only

v1.4.0 is the stable baseline. Major functionality (events, RSVPs, mod dashboard, CRON, debug logging) is snappy and works on iOS/Android. Future work is constrained to:
- **UI polish** — typography tokens, spacing scale, transitions, edge-case responsiveness.
- **New mod features** — bulk approve, edit after submission, attendee preview, RSVP capacity limits.

**Do not revisit** core card shell, event delegation, optimistic updates, or guard patterns without strong reason. Those are settled.

## 40. OpenSpec as the Single Source of Truth for Tracking (2026-06-15)

**Principle:** All new requirements, enhancements, and bug fixes are tracked exclusively in OpenSpec (`openspec/changes/`). The legacy `BUG_REGISTRY.md`, `ENHANCEMENTS.md`, and `AUDIT.md` files are now **archived** — kept for historical context but no longer maintained.

### Why
- OpenSpec ties requirements to specs, design docs, and tasks in one place.
- The `applyRequires` gate ensures changes can't be implemented without a complete proposal.
- The validation CLI catches missing or malformed changes.
- Priority (1–5 scale) lives in each change's `proposal.md` — easy to filter and rank.
- One tool, one place, one workflow.

### Priority Scale
- **5/5** — Top priority. Do next.
- **4/5** — High impact. Do soon.
- **3/5** — Important. Do this iteration.
- **2/5** — Useful. Backlog.
- **1/5** — Future. Tracked but not active work.

### File Layout
```
openspec/
  changes/
    <change-name>/
      proposal.md       # Why, what changes, priority, impact
      design.md         # Context, decisions, risks, open questions
      tasks.md          # Numbered checklist, - [ ] for pending, - [x] for done
      specs/
        <capability>/
          spec.md       # ADDED/MODIFIED requirements with WHEN/THEN scenarios
  specs/                # Archived/main specs (mirror of completed changes)
```

### Lifecycle
1. **Proposed:** `proposal.md` + `design.md` + `tasks.md` + `specs/<cap>/spec.md` exist. Not yet implemented.
2. **In Progress:** Tasks check off as work happens. Spec may iterate.
3. **Complete:** All tasks checked, build/test/type-check pass, code merged, then `openspec archive <name>` moves the change into `openspec/specs/<cap>/spec.md` and the change folder is removed.
4. **Future/Parked:** Tasks are empty or all unchecked. Status documented in `proposal.md`.

### Creating a New Change
- **Required:** `proposal.md` (with **Priority:** field at the top), `tasks.md`.
- **Recommended:** `design.md` for non-trivial changes, `specs/<cap>/spec.md` for user-visible behavior changes.
- **Naming:** kebab-case, descriptive prefix. Examples: `e3-attendee-preview-on-home-card`, `fix-bug6-past-event-rsvp-block`, `add-dark-mode`.

### Archive Headers
When a legacy file is archived, prepend:
```markdown
# ⚠️ ARCHIVED 2026-06-15 — see openspec/changes/ for active tracking
```
and link to the OpenSpec list. Do not delete the file — the historical record (who fixed what and when) is valuable.

### What This Replaces
- `docs/archive/BUG_REGISTRY.md` — bug list (all entries fixed; historical). Moved from repo root 2026-06-15.
- `docs/archive/ENHANCEMENTS.md` — feature backlog (now in `openspec/changes/`). Moved from repo root 2026-06-15.
- `docs/archive/AUDIT.md` — full app audit (~34 still open, now in `openspec/changes/`). Moved from repo root 2026-06-15.

### Active Changes Snapshot (2026-06-15)
| Change | Priority | Status |
|---|---|---|
| `e1-event-capacity` | 4/5 | proposed |
| `e2-edit-event` | 3/5 | proposed |
| `e3-attendee-preview-on-home-card` | 5/5 | proposed |
| `e9-notify-opt-in` | 1/5 | future (Devvit push gated) |
| `e10-search-filter-ui` | 1/5 | future |
| `fix-sec1-webhook-consent` | 5/5 | proposed |
| `fix-sec2-rate-limiting` | 4/5 | proposed |
| `fix-sec3-csv-injection` | 3/5 | proposed |
| `fix-bug2-cron-reminder-retry` | 2/5 | proposed |
| `fix-bug3-first-cron-skip` | 3/5 | proposed |
| `fix-bug5-default-event-magic-string` | 2/5 | proposed |
| `fix-bug6-past-event-rsvp-block` | 2/5 | proposed |
| `fix-bug7-rsvp-confirm-update` | 2/5 | proposed |
| `fix-bug8-confirm-resolver-queue` | 2/5 | proposed |
| `ux6-15-list-view-and-polish` | 2/5 | proposed (bundle) |
| `perf4-6-render-and-fonts` | 2/5 | proposed (bundle) |
| `cq1-12-code-quality-and-tests` | 1/5 | proposed (bundle) |

## 41. Project Documentation Structure (2026-06-15)

**Principle:** Repo root is reserved for essentials only. All historical or auxiliary documentation lives under `docs/`.

### Root essentials
- `LEARNINGS.md` — platform knowledge base (always at root; agents reference it frequently)
- `README.md` — project overview and setup
- `TEST_CASES.md` — manual end-to-end test suite
- `LICENSE`, `package.json`, `tsconfig.json`, `devvit.json`, `package-lock.json`
- `.gitignore`, `.npmrc`, `.nvmrc`
- `.opencode/` — OpenCode project config (commands, skills)
- `docs/`, `openspec/`, `src/`, `public/`, `tools/`

### `docs/` layout
```
docs/
├── README.md           # Index of all documentation
├── archive/            # Historical files, DO NOT EDIT
│   ├── BUG_REGISTRY.md
│   ├── ENHANCEMENTS.md
│   └── AUDIT.md
└── releases/           # Version release notes
    ├── v1.4.0.md
    ├── v1.4.1.md
    └── v1.4.2.md
```

### When to create new things
- **New historical record (a completed initiative, a frozen design doc):** add to `docs/archive/` with an archive header.
- **New release notes:** add `docs/releases/vX.Y.Z.md` immediately after tagging the release.
- **New active requirement/enhancement/bug fix:** add to `openspec/changes/<name>/` per §40.
- **New platform knowledge (gotcha, pattern, decision):** add a new section to `LEARNINGS.md` at root.
- **Never add .md files to root other than the 3 essentials** (`README.md`, `TEST_CASES.md`, `LEARNINGS.md`).

### When reviewing a PR
- New .md file at root (other than the 3 essentials) → ask to relocate to `docs/` or `openspec/`.

## 42. sendPrivateMessage: Modmail vs Individual PM (2026-06-15)

**The two `sendPrivateMessage` modes are NOT the same in Devvit.** This is a frequent source of confusion when reviewing CRON code:

| Mode | API call | Status |
|---|---|---|
| **Modmail to subreddit** | `reddit.sendPrivateMessage({ to: "/r/subreddit", subject, text })` | ✅ **Works** in Devvit (tested in `onCheckEvents` CRON) |
| **DM to individual user** | `reddit.sendPrivateMessage({ to: "username", subject, text })` | ❌ **Fails** with `ERR_INVALID_ARG_TYPE` |

See `docs/archive/BUG_REGISTRY.md` §P2 for the original discovery.

**Implications:**
- Mod alerts (modmail to `/r/subreddit`) in `onCheckEvents` (`server.ts:810`) are correct and working. They are **not** "wasted API calls" — they succeed.
- The disabled `onSendReminders` (`server.ts:693`) was an individual-user DM function. It is correctly a no-op.
- If you see a `try/catch` around `sendPrivateMessage`, check the `to` field before assuming it's broken. The try/catch is defensive but the modmail version works.

**Tested flows:**
- ✅ `onCheckEvents` → modmail to `/r/meetup_hub2_dev` → arrives in modmail
- ❌ Direct user DM → throws `ERR_INVALID_ARG_TYPE` → never arrives

**Reference:** Original investigation in BUG_REGISTRY §P2 (2026-05-27).

## 43. UI/UX Polish Patterns (2026-06-15)

**v1.5.0 is a UI/UX-only release.** No new API endpoints, no behavior changes, no OpenSpec change creation. Existing 27 OpenSpec items remain as the future roadmap; this release polishes what is already shipped. All patterns preserve the app's current calling conventions (event delegation, per-tab fetch flags, optimistic updates, bounce guards, stale response guards).

### Patterns learned during the polish pass

1. **Typography tokens** — add `--text-xs/sm/base/md/lg/xl/2xl` to `:root` even if not all are used yet. Saves future `font-size: 14px;` inline overrides.
2. **Motion tokens** — `--t-fast/base/slow` + `--ease` keep transition timing consistent across the app.
3. **Hover lift on every interactive element** — `.btn`, `.icon-btn`, `.footer-btn`, `.close-btn` all get `transform: translate(-1px, -1px)` + slightly larger shadow on `:hover`. Pair with `:active` translate-down. This is the neo-brutalist "physical" feel.
4. **`:focus-visible` ring** — separate from `:focus` (which fires on click). Pink ring (`var(--secondary)`) is the brand a11y color. Critical for keyboard / screen-reader users.
5. **Reduced-motion media query** — `@media (prefers-reduced-motion: reduce)` must kill the infinite loading-emoji bounce and shorten all transitions. One block at the end of the style sheet.
6. **`fade-in` only on first render, not on Prev/Next** — `buildCardShell({ noFade: true })` is passed from every Prev/Next handler. Re-fading on every navigation feels jittery.
7. **Step dot pulse on advance** — `pulseDot(id)` helper adds `.just-pulsed` for 320ms; CSS `@keyframes stepPulse` scales the dot 1 → 1.6 → 1. Small, satisfying feedback for the multi-step details overlay.
8. **Active tab accent** — `box-shadow: inset 0 -4px 0 var(--secondary)` on `.tab.active` gives a clear "you are here" indicator without changing the tab height (no layout shift).
9. **`.empty-state.compact` modifier** — the standard 64px emoji + 40px padding is too big for in-overlay empty states. A `.compact` modifier drops to 36px emoji + 20px padding. Cleaner than inline overrides.
10. **TypeScript closure null-check** — when a helper captures a `var el = getElementById(...)`, TS doesn't track the null check across the `setTimeout` boundary. Fix: `var dot = el;` to create a non-nullable local copy before the closure. See `pulseDot()`.
11. **One-pass a11y setup** — at `DOMContentLoaded`, add `role` + `tabindex` + `aria-label` to all static `.close-btn` elements once. Dynamic elements (rendered into `innerHTML`) would need re-running after each render, but close buttons are static so one pass is enough.

### What was deliberately NOT changed

- API call patterns (per LEARNINGS §0.2, §40, §41, §42)
- Data shapes (no new fields)
- Optimistic update logic (works correctly, per `fix-bug7` future fix)
- Bounce guards, stale response guards (correctly working)
- `hDel([field])` array wrapping (correctly applied)
- `zScore` undefined check (correctly applied)
- 27 OpenSpec changes (still tracked, not implemented)
- The `homeShareUrl` global (acknowledged low risk in v1.4.3)
- `buildCardShell` signature (kept backward-compatible by adding `noFade` as an optional, defaulted-false parameter)

## 44. Section-Scoped Button Size System (2026-06-17)

**v1.5.1 fixes the "View Details is way bigger than RSVP" bug.**

### The bug
Inline `style="padding:...; font-size:...; margin-top:...; flex:...; "` attributes had drifted across ~40 button call sites. Different buttons in the same row had different paddings (8px vs 10px vs 12px), different font-sizes (11px vs 12px vs 13px vs 14px), and different margins. Long labels like "View Details →" wrapped to 2 lines because the column was too narrow, making the button appear visibly larger than the shorter "RSVP" button next to it.

### The fix: section-scoped button classes
Instead of inline overrides, every button now uses one of these classes (defined once in `:root` → CSS, top of `app.html`):

| Class | Use | Padding | Font | Min-height |
|---|---|---|---|---|
| `.btn` (default) | Full-width CTAs (Submit Event, RSVP Now, etc.) | 10px 16px | 14px | auto |
| `.btn-action` | Action row buttons in card shell (View Details, RSVP, Approve, Decline, etc.) | 8px 6px | 12px | 38px |
| `.btn-icon` | Square icon-only buttons in action row (Share 📤) | 8px 10px | 14px | 38px / 38px |
| `.btn-action-full` | Full-width single-button action row (Delete Event, Dismiss) | 10px 8px | 13px | 40px |
| `.btn-pager` | Pagination prev/next (desc nav, att nav) | 4px 10px | 11px | 24px |
| `.btn-compact` | Inline buttons in overlay footers (RSVP submit, confirm yes/no, mod attendees CSV) | 10px 14px | 13px | auto |
| `.btn-copy` | Inline copy buttons next to links (Google Maps Copy) | 6px 14px | 12px | auto |
| `.btn-empty` | Buttons inside empty states | 6px 12px | 12px | 30px |

**Adding the right class to the right button in the right section** is now enough — no inline style needed.

### Why section-scoped, not ad-hoc utilities
The user requested "make it such that it's easier to manage the size consistency in each section easily". The classes are named by **where the button lives**, not by what it does. So if you ever decide the mod card action row needs bigger buttons, you change `.btn-action` in one place and every action row across the app updates. Compare to ad-hoc utilities like `.btn-pad-sm` (sized-by-property) which would scatter "what size should a mod approve button be?" knowledge across every render function.

### Bug-specific fix: "View Details →" was wrapping
The home card's "View Details →" was wrapping to 2 lines at `font-size:13px` because the column was narrow. Fixed by:
1. Dropping font to 12px (in `.btn-action`)
2. Adding `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` so anything that would wrap is now ellipsized
3. Shortening the label from "View Details →" to "Details →" so it fits in one line

Same fix applied to mod card "View Details →" (now "Details →"). My Stuff "Update Contact" (now "Update"). All single-line action row labels are now ≤10 chars.

### What was deliberately NOT changed
- `.btn-sm` and `.btn-inline` classes (left in place; rarely used; not worth removing)
- `style="width:80%;"` on the RSVP Now button in details step 4 (centered fullscreen CTA, not in an action row — needs the inline width constraint for visual centering)
- The 4 outline-style tab headers (`.tab`) — those have their own size system

### Manual test checklist
- [ ] Home card: 3 action buttons are equal height, single line, "Details →" doesn't wrap
- [ ] Mod card pending: Approve / Decline equal height
- [ ] Mod card published: Details / Attendees (count) equal height, Delete below full width
- [ ] My Stuff RSVP card: Update / Leave equal height
- [ ] Mod attendees: pager prev/next + Copy CSV don't overlap
- [ ] Empty states (no RSVPs, no pitches, no events): buttons fit comfortably in the compact card
- [ ] Confirm overlay: Cancel / Yes, Do It equal width, equal height
- [ ] RSVP overlay: single Confirm button (no change needed, uses `.btn`)

### Manual test checklist (do on each release)

- [ ] iOS Safari: tap every button, verify hover lift + active press
- [ ] iOS Safari: `navigateTo` away and back, verify the visibility re-init (when fix-ios-blank ships)
- [ ] iOS Settings → Accessibility → Reduce Motion → verify bouncing emoji stops
- [ ] Keyboard-only navigation: Tab through all buttons, verify pink focus ring
- [ ] VoiceOver: swipe through header, verify aria-labels read correctly
- [ ] Home → Prev/Next: verify no re-fade, only step dot pulses
- [ ] Mod dashboard → Pending → Next: verify card updates without re-fade
- [ ] My Stuff → RSVP empty state: verify smaller compact empty state renders

## 45. Pitch Proposed Date/Time Field (2026-06-17)

**v1.6.0 adds optional "proposed date" + "proposed time" fields to the pitch form.**

### Why
A pitch is an idea — but ideas usually come with a "when do you imagine this happening?" context. Without a date, mods reading the pitch have to guess at timing. The proposed fields are just suggestions; they're not commitments. The organizer of the resulting event will set the real date when submitting.

### Scope (medium change, 4 files)
1. **`public/app.html`** — 2 new form inputs (`<input type="date" id="pitch-date">`, `<input type="time" id="pitch-time">`) in the pitch overlay body
2. **`src/shared/api.ts`** — extended `PitchFormData` with optional `proposedDate?: string; proposedTime?: string;`
3. **`src/server/server.ts`** — `onPitchIdea` reads new fields, validates with regex, includes them in the saved JSON. Backward compatible: old pitches without these fields still work.
4. **`src/client/app.ts`** — 3 places:
   - `submitPitch()`: reads new fields, conditionally includes in payload (only if non-empty)
   - `renderMyPitchCard()`: shows "💡 Proposed: DATE at TIME" in the header (or "📅 Pitched: ..." if no proposed date)
   - `renderModCard()` pitches branch: shows "💡 Proposed: DATE at TIME" in the mod header (only if proposed date exists)

### Server validation
```ts
if (proposedDate && !/^\d{4}-\d{2}-\d{2}$/.test(proposedDate)) return { error: "Invalid date format", status: 400 };
if (proposedTime && !/^\d{2}:\d{2}$/.test(proposedTime)) return { error: "Invalid time format", status: 400 };
```
The regexes are tight enough to prevent Redis poisoning but loose enough to accept any plausible date/time from the HTML5 date/time inputs.

### Backward compatibility
- Old pitches (pre-v1.6.0) in Redis don't have `proposedDate` / `proposedTime` fields
- Render code checks `if (item.proposedDate)` and skips the line if missing
- New pitches with empty date/time fields also skip the line (both `proposedDate` and `proposedTime` are conditional in the render)
- No migration needed for existing data

### Why optional, not required
The user said "should also have the field" — not "must require". Forcing the date would be friction for pitches that are abstract ("what if we did X sometime?"). The fields are there for users who want to propose timing; users who don't can leave them empty.

### Manual test checklist
- [ ] Open pitch overlay: 4 fields visible (title, description, proposed date, proposed time)
- [ ] Submit without date/time: works, no error, no proposed line shown in My Stuff
- [ ] Submit with date only: works, shows "💡 Proposed: 2026-06-28" in My Stuff and Mod Dashboard
- [ ] Submit with date + time: works, shows "💡 Proposed: 2026-06-28 at 22:38" everywhere
- [ ] Old pitches in My Stuff (no date): show "📅 Pitched: ..." instead
- [ ] Old pitches in Mod Dashboard: no proposed line shown
- [ ] Server validation: invalid date string returns "Invalid date format" error

## 46. Side-by-Side Form Rows + Review Page Horizontal Scroll (2026-06-17)

**v1.6.1 fixes two layout regressions from v1.5.5/v1.5.6 + v1.6.0.**

### Side-by-side date+time

**Problem:** In v1.5.4 we restructured the submit-event form into 5 steps. Date and Time were two stacked `form-group`s. Same in v1.6.0 for the pitch form's proposed date/time. On a 360px-wide mobile screen, the stacked date+time pair wastes ~80px of vertical space — the user has to scroll past them to reach Submit. Plus the date picker takes the full width even though it's only ~120px wide.

**Fix:** New `.form-row` CSS class:
```css
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; min-width: 0; }
```

The `min-width: 0` is the magic property — without it, flex children default to `min-width: auto` which prevents them from shrinking, so date/time inputs would force horizontal overflow instead of side-by-side.

**Applied to:**
- Pitch form: Proposed Date + Proposed Time (v1.6.0 stacked → v1.6.1 side-by-side)
- Submit event form: Date + Time (v1.5.4 stacked → v1.6.1 side-by-side)

### Review page horizontal scroll

**Problem:** v1.5.5 set the review page description to `white-space:pre; overflow:auto` for horizontal scroll on long single lines. v1.5.6 changed it to `white-space:pre-wrap; word-break:break-word` to fill available vertical space. The latter change broke the original intent: long lines now wrap to fit, so a long unbreakable token (URL, or a string with no spaces) gets cut off at the right edge of the box with no way to see the full content.

The user reported: "the review page for submit event still doesn't have the horizontal scroll to view the full details."

**Fix:** v1.6.1 keeps `flex:1; min-height:0; overflow:auto` (so it fills available space and scrolls vertically) but switches the description back to `white-space:pre` (no wrap). The `min-width:0; max-width:100%` on the flex child ensures the box itself doesn't overflow its parent.

For the title and meta lines, switched from `overflow-wrap:break-word` (wraps long tokens) to `min-width:0; max-width:100%; overflow-x:auto; white-space:nowrap` (single line, horizontal scroll if too long). This matches the rest of the app's "horizontal scroll for long single-line content" pattern.

### Why `min-width:0; max-width:100%` matters

`max-width:100%` alone is NOT enough. In a flex child, the default `min-width: auto` means the child is allowed to be as wide as its content, ignoring `max-width:100%`. The `min-width:0` override unlocks the shrink-to-fit behavior so the box can be narrower than its content, which is what enables `overflow-x:auto` to actually kick in.

This is a flexbox gotcha documented in the v1.5.5 release notes too.

### Manual test checklist
- [ ] Open pitch form: date and time are side-by-side, both fit on one row on 360px screen
- [ ] Open submit event form step 2: date and time are side-by-side
- [ ] On step 5 (review) with a long description: a long unbreakable line (e.g., a URL) overflows the box and the box becomes horizontally scrollable
- [ ] On step 5 with a short description: text fills the box vertically, no scrolling needed
- [ ] Review title and meta lines scroll horizontally if too long to fit

## 47. iOS Blank-Webview After `navigateTo` (2026-06-17)

**v1.6.2 fixes a known iOS platform bug where the webview is left blank after `navigateTo(url)` + user taps Back.**

**Bug:** On iOS Safari and the iOS Reddit app, calling `navigateTo(url)` to push the user to a native Reddit page (share link, "View on Reddit" button, future DM compose), then tapping Back, often returns to a blank webview. The page chrome (header, tabs) is gone; only a white screen remains. The user has to force-quit the Reddit app and reopen the post to recover.

**Fix:** A `visibilitychange` listener in `DOMContentLoaded` (`src/client/app.ts`) that re-renders the active surface when the page becomes visible again:

```ts
var lastVisAt = 0;
var visReRenderInProgress = false;
document.addEventListener("visibilitychange", function () {
  var now = Date.now();
  var state = document.visibilityState;
  log("VISIBILITY state=" + state);
  if (state !== "visible") return;
  if (now - lastVisAt < 500) { log("VISIBILITY throttled (debounce)"); return; }
  lastVisAt = now;
  if (visReRenderInProgress) { log("VISIBILITY skipped: re-render in progress"); return; }
  visReRenderInProgress = true;
  log("VISIBILITY action=soft-render");
  var modOverlay = document.getElementById("mod-screen");
  var myStuffOverlay = document.getElementById("my-stuff-overlay");
  try {
    if (modOverlay && modOverlay.classList.contains("active")) loadModTab(modTab);
    else if (myStuffOverlay && myStuffOverlay.classList.contains("active")) loadMySubmissions();
    else loadHome();
  } finally {
    setTimeout(function () { visReRenderInProgress = false; log("VISIBILITY flag released"); }, 500);
  }
});
```

**Key design decisions:**

1. **Soft-render, not hard re-init.** A full `init()` would wipe open overlays (e.g., a half-filled submit-event form) and any in-flight form state. Soft-render re-fetches home data and re-renders the current card. Open overlays stay open; the user doesn't lose what they were doing.
2. **500ms throttle.** iOS sometimes fires `visibilitychange` twice in quick succession (once on transition, once on focus). The throttle coalesces these.
3. **`visReRenderInProgress` guard.** If a re-render is already in flight, the next event is skipped. This prevents re-entrancy loops where the re-render itself triggers another visibility event.
4. **500ms lock release via `setTimeout`.** The lock is released in a `setTimeout` regardless of whether the underlying re-render completed synchronously or async, so the next legitimate visibility event is never blocked for long.
5. **Per-surface routing.** The handler routes to the right loader based on which overlay is active. `loadModTab(modTab)` for mod dashboard, `loadMySubmissions()` for My Stuff, `loadHome()` for the home page. Each of these has its own fetching guard, so re-entry is safe.

**Why this matters now:** Once `e13-direct-message-organizer` lands, every mod and attendee DM button will trigger `navigateTo()`. Shipping e13 without this fix would surface the blank-webview bug to every user who ever messages an organizer. The fix is a prerequisite for e13.

**Logging per §0.2:** All paths log via `log()` — `VISIBILITY state=visible/hidden`, `VISIBILITY throttled`, `VISIBILITY skipped`, `VISIBILITY action=soft-render`, `VISIBILITY refresh home/modTab=X/my-stuff`, `VISIBILITY flag released`. This makes the fix debuggable from the on-screen debug panel on a real device.

**Out of scope (deferred):**
- Hard re-init if user is away > 5 minutes (YAGNI for v1.6.2).
- A "Reconnecting..." overlay during re-render (current re-render is fast enough that a loading state isn't needed; if latency becomes an issue, that's a separate change).
- Android-specific quirks (the bug is documented as iOS-primary; Android usually works fine).

**Manual test checklist:**
- [ ] On iOS Safari, navigate to a Reddit URL via a `navigateTo()` call, tap Back, verify the app re-renders (home card visible, no blank screen)
- [ ] On iOS Reddit app, same test
- [ ] Open the debug panel, navigate away, navigate back, see `VISIBILITY state=visible action=soft-render` and `VISIBILITY refresh home`
- [ ] With a mod overlay open, navigate away and back, see `VISIBILITY refresh modTab=pending` (or whatever tab was active)
- [ ] With a my-stuff overlay open, navigate away and back, see `VISIBILITY refresh my-stuff`
- [ ] Rapid double-toggle visibility: only one re-render fires (throttle works)

## 48. CSV Export Safety: Formula Injection + RFC 4180 (2026-06-17)

**v1.6.2 makes the attendee CSV export safe against formula injection and RFC 4180 violations.**

**Bug:** `onExportAttendees` in `src/server/server.ts` built CSV with simple string concatenation:

```ts
const lines = ["Username,Email,Phone"];
for (const a of attendees) {
  lines.push(`${a.username},${(a.email || "").replace(/,/g, "")},${(a.phone || "").replace(/,/g, "")}`);
}
```

Two problems:

1. **CSV formula injection (security).** If a username starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, Excel/LibreOffice/Google Sheets will interpret the cell as a formula and may execute arbitrary code on open. Example: a username of `=cmd|'/c calc'!A1` runs `calc.exe` when an organizer opens the CSV. The `.replace(/,/g, "")` strip does nothing to prevent this.
2. **RFC 4180 violation (data corruption).** Any field containing `,`, `"`, or newline breaks the CSV. The current code mangles the data by silently stripping commas instead of escaping them. A username like `alice,bob` would export as `alicebob` — a real, silent data loss.

**Fix:** A `csvEscape(value)` helper in `src/shared/meetit.ts` (exported for unit testing):

```ts
export function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  let v = String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;  // formula guard
  return `"${v.replace(/"/g, '""')}"`;        // RFC 4180 quote+escape
}
```

`onExportAttendees` now uses `csvEscape` for every field (header + data):

```ts
const header = [csvEscape("Username"), csvEscape("Email"), csvEscape("Phone")].join(",");
const lines = [header];
for (const a of attendees) {
  lines.push([csvEscape(a.username), csvEscape(a.email), csvEscape(a.phone)].join(","));
}
```

**Why the formula guard prepends `'`:** The single quote is the standard "force-text" prefix that tells Excel to treat the cell as a literal string instead of a formula. The `'` is not displayed in the cell; it just suppresses formula evaluation. This is the OWASP-recommended mitigation for CSV injection.

**Why include `\t` and `\r` in the guard:** Some Excel versions treat leading tab/CR as formula triggers, especially in combination with other control characters. Including them is the conservative choice.

**Why quote all fields, not just ones with special chars:** The previous behavior (no quotes) was technically broken for any field with `,` or `"`. Always-quoting is RFC 4180-compliant, simpler to reason about, and all spreadsheet apps handle it identically.

**Why a single-quote `'` guard in addition to quoting:** Quoting alone does NOT prevent formula injection. The formula `=cmd|...` inside `"=cmd|..."` is still a formula. The single-quote guard must come first, then the value is wrapped in double quotes.

**Test coverage (5 unit tests in `tools/meetit-behavior.test.ts`):**
- `csvEscape` wraps plain strings in double quotes
- `csvEscape` handles commas, quotes, and newlines per RFC 4180
- `csvEscape` prevents formula injection for dangerous leading characters (`=`, `@`, `+`, `-`, `\t`, `\r`)
- `csvEscape` returns empty quoted string for null/undefined
- (implicit) `csvEscape("")` returns `""`

**Logging per §0.2:** The existing `[EXPORT] ${eventId} | ${attendees.length} attendees | by ${context.username}` log remains. If any attendee field triggers the formula guard, the data is still exported — we don't log per-field, only the export request as a whole. The log is unchanged so we don't leak user data into server logs.

**References:**
- OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
- RFC 4180: https://www.ietf.org/rfc/rfc4180.txt

**Manual test checklist:**
- [ ] Export an event's attendees; open the CSV in Excel, LibreOffice, and Google Sheets
- [ ] All cells render as text (no formula evaluation)
- [ ] A username containing `,` exports as `"alice,bob"` (quoted, not stripped)
- [ ] A username containing `"` exports as `"alice""bob"` (doubled quote, RFC 4180)
- [ ] A username starting with `=`, `+`, `-`, `@` is prefixed with `'` to suppress formula evaluation
- [ ] Empty email/phone cells render as empty strings, not the literal text "undefined"

---

## 49. Reminder Post System: textFallback → Plain Text Post + `u/` Prefix Trap (2026-06-19)

The reminder post feature went through **two major iterations** and **one hotfix** before settling on the final design. This section captures the lessons so future maintainers don't repeat the mistakes.

### Iteration 1: `textFallback` on `submitCustomPost` (REJECTED)

**First attempt:** Use `reddit.submitCustomPost({ textFallback: { text: buildReminderBody(...) } })`.

**Why it seemed right:** The Devvit docs explicitly market `textFallback` as enabling cross-client body rendering for interactive posts. The buildReminderBody produced a 500-char markdown body — well under the 40K limit.

**Why it failed in production:** Live testing in `r/meetup_hub2_dev` showed the post **still rendered the full Meetit app iframe** on new.reddit and the official mobile app. The `textFallback` was only used as a fallback on platforms that **cannot** render the iframe at all (old.reddit, 3rd-party mobile apps, screen readers, search, AutoMod). The body remained hidden from the primary viewing surface.

**Lesson:** `textFallback` is **NOT** a way to show body content alongside an app post. It is a *fallback for platforms where the iframe cannot render*. The post still has an iframe as its primary surface on every client that supports it. **If you want a visible body, use `submitPost` (plain text post) instead.**

### Iteration 2: `submitPost` plain text post (CURRENT)

**What we shipped:** `reddit.submitPost({ title, text, subredditName? })` creates a true plain text post. The body is the post body — visible on every Reddit client, gets the full comment thread UI, and is what Redditors see when they open the post.

**Trade-off:** Plain text posts don't launch the Meetit app iframe. To preserve the RSVP entry point, the body now ends with:
```
🚀 **[Open in Meetit to RSVP](https://www.reddit.com/r/${subredditName})**
```

**Lesson:** When the user-facing goal is **discussion** (not running an interactive app), `submitPost` is the right call. The deep link in the body is the entry point to the in-app RSVP flow.

### Hotfix: `u/u/darelphilip` — the `u/` prefix trap

**Bug:** First live body rendered as:
```
**Organized by:** u/u/darelphilip
```

**Root cause:** The submit-event form prefill at `app.ts:2310` literally prepends `u/` to the organizer username:
```ts
(document.getElementById("event-organizer") as HTMLInputElement).value = "u/" + currentUsername;
```

The form input is also a free-text field — users can type `u/theirname` manually. So `event.organizer` is **stored in Redis with the `u/` prefix** by design. The original `buildReminderBody` then blindly re-prefixed with `u/${event.organizer}`, producing `u/u/darelphilip`.

The mod list happened to render correctly because `mod_usernames` is stored without the `u/` prefix (it's a comma-separated username list parsed from a setting, not user-typed text).

**Fix:** Added a private `stripUsernamePrefix(raw)` helper in `src/shared/meetit.ts`:
```ts
function stripUsernamePrefix(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (/^u\//i.test(s)) s = s.slice(2).trim();
  return s;
}
```

`buildReminderBody` now normalizes both organizer and mod list before re-prefixing. The function is now **defensive** — it accepts usernames with OR without `u/` and always renders exactly one.

**Lesson:** When storing user-typed text that may include a prefix (like `u/`, `@`, `#`, `r/`, `https://`), **always normalize at the boundary where you re-prefix it**. Don't trust the storage format. The fix is small (~10 lines) but the bug is user-visible.

### Hotfix: Title format `Event Reminder - event name - date @ location`

**User feedback after first deploy:** The title was just `🔔 Reminder: ${event.title} — ${event.date}` — too terse. Wanted `Event Reminder - event name - date @ location` for more context.

**Fix:** Extracted a new pure helper `buildReminderTitle(event)` in `src/shared/meetit.ts`:
```ts
export function buildReminderTitle(event: Pick<MeetitEvent, "title" | "date" | "location">): string {
  const title = event.title || "TBD";
  const date = event.date || "TBD";
  const location = event.location && event.location.trim();
  return location
    ? `🔔 Event Reminder: ${title} — ${date} @ ${location}`
    : `🔔 Event Reminder: ${title} — ${date}`;
}
```

`@ location` is omitted when location is empty/whitespace. The date and title fall back to `TBD` (mirrors body builder behavior).

**Lesson:** When title and body format live in different files, extract them as separate pure functions (in `src/shared/meetit.ts`) so they're independently testable. The buildReminderTitle is 4 unit tests; buildReminderBody is 13. Both pass.

### Files changed in the e24 implementation

| File | Lines | Purpose |
|------|-------|---------|
| `src/shared/meetit.ts` | +90 | New `buildReminderBody()`, `buildReminderTitle()`, private `stripUsernamePrefix()` |
| `src/server/server.ts` | +30 | `parseModList()` helper, `buildReminderBody()` + `buildReminderTitle()` calls in `onCheckEvents`, retry window fix, dedup flag after success |
| `tools/meetit-behavior.test.ts` | +91 | 13 new test cases (4 body + 9 title) |
| `public/app.html` | 0 (this was for e25, not e24) | (n/a) |

### OpenSpec outcome

- `e24-discussion-friendly-reminders` archived with **correction history** in proposal.md (v1 = textFallback, v2 = plain text post, hotfix for `u/` and title)
- `reminder-system` capability spec lives at `openspec/specs/reminder-system/spec.md`
- 35 → 36 OpenSpec items (added `rsvp-disclosure` in e25)

### Verification commands (use these in any future reminder post debugging)

```bash
# 1. Render the body locally to verify the format
node --experimental-strip-types -e "
import { buildReminderBody, buildReminderTitle } from './src/shared/meetit.ts';
const event = { title: 'Test', date: '2026-06-20', time: '18:00', location: 'Park', description: 'Bring snacks', organizer: 'u/darelphilip' };
console.log('TITLE:', buildReminderTitle(event));
console.log('BODY:');
console.log(buildReminderBody(event, 'u/darelphilip', ['modA', 'modB'], 'meetup_hub2_dev'));
"

# 2. Confirm the bundle has the new helpers
grep -E "buildReminderTitle|stripUsernamePrefix" dist/server/index.js

# 3. Watch CRON logs for the new post
devvit-cli logs r/meetup_hub2_dev
# Look for: [CRON] Reminder post sent for ... (postId=...)

# 4. Inspect a posted reminder via Reddit JSON API (auth required since May 28, 2026)
curl -H "Authorization: Bearer <token>" https://oauth.reddit.com/r/meetup_hub2_dev/comments/1uacdhy | jq '.[] | .children[].data | {title, selftext}'
```

### Why I didn't create a new OpenSpec change for the hotfix

Per the surgical-change rule (see §40): the `u/` prefix and title format are both correctness/UX defects in the same `reminder-system` capability. The fix is ~20 lines of code + 9 unit tests. Creating a new OpenSpec change for < 30 minutes of work would be more bureaucracy than the fix itself. Instead, the archived `e24-discussion-friendly-reminders/design.md` has a new "Post-launch hotfix" section documenting both bugs and their fixes.

The "what changed" rule for hotfixes:
- Total footprint < 50 lines of code: hotfix the existing capability, document in archived design.md
- Total footprint ≥ 50 lines OR new capability: create a new OpenSpec change

### Cross-references

- `openspec/specs/reminder-system/spec.md` — current spec
- `openspec/changes/archive/2026-06-19-e24-discussion-friendly-reminders/{proposal,design,tasks}.md` — full proposal + design + correction history
- `src/shared/meetit.ts:140` — `buildReminderBody()` (current)
- `src/shared/meetit.ts:209` — `buildReminderTitle()` (current)
- `src/server/server.ts:780` — `onCheckEvents()` reminder loop (current)
- `src/server/server.ts:188` — `parseModList()` helper
- `app.ts:2310` — `prefillOrganizer()` (the source of the `u/` prefix in stored data)

---

## 50. Reminder Post Maps Link + Deep Link to Launcher Post (2026-06-19)

After the e24 reminder system shipped and the e24 hotfix (§49) fixed the `u/u/` bug, two more user-visible defects remained in the reminder body:

1. **No Google Maps link**, even though the form has a maps field and the rest of the app shows it.
2. **"Open in Meetit" deep link went to the subreddit homepage**, not the actual Meetit app post.

### Defect 1: Missing Google Maps link

**Root cause:** `buildReminderBody()` didn't read `event.mapUrl`. The field exists in the `MeetitEvent` type (`src/shared/api.ts:9`), is populated by the form (`public/app.html:482`), is stored in Redis by `createPendingEvent()` (`src/shared/meetit.ts:72`), and is rendered in the home card (`app.ts:1034`) and mod detail (`app.ts:1694`) with a copy button. The reminder body was the only place that ignored it.

**Fix:** Added a `## 🗺️ [Open in Google Maps](${mapUrl})` section in `buildReminderBody()`. Skipped entirely when `event.mapUrl` is empty/whitespace/missing. No URL validation — the form is the trust boundary, and the reminder just renders whatever the user typed.

**Lesson:** When you have a "do not forget the obvious fields" check, do an **end-to-end audit**: form → type → server storage → all rendering sites (home card, mod detail, CRON reminder, share exports). The reminder body was missing the maps link because I added it to the body without running through the full data flow.

### Defect 2: Subreddit homepage instead of Meetit app post

**Root cause:** The "Open in Meetit" deep link was `https://www.reddit.com/r/${subredditName}` — the subreddit's main feed. The user expected it to deep-link to the most recent Meetit app post (created via the `Create Meetit Post` menu action) so attendees could tap straight into the app to RSVP.

**Fix in two parts:**

1. **Track the launcher post ID.** In `onMenuCreatePost()` (the menu action handler), after the post is created, persist `post.id` to `meetit:meetit_app_post_id` in Redis. Wrapped in try/catch so a Redis write failure does not block the post creation UX (the post is already created; the only loss is that the next reminder will fall back to the subreddit homepage).

2. **Read the launcher post ID in CRON.** In `onCheckEvents()`, before the per-event loop, read `meetit:meetit_app_post_id` and build the URL `https://www.reddit.com/comments/${id}/` (stripping any `t3_` prefix). Pass this as the new 5th parameter `meetitAppPostUrl` to `buildReminderBody()`.

3. **Body builder prefers launcher post URL.** When `meetitAppPostUrl` is set, the deep link points to the app post. When unset, it falls back to the subreddit homepage with a hint for mods: "*Mods: create a 'Meetit - Community Meetups' post via the subreddit menu to make this link go straight to the app.*" This hint is the self-documenting workaround for fresh installs.

**Why a Redis key instead of querying:** CRON context has no `context.postId` (per `LEARNINGS.md` table in §11.1 — "CRON context: `context.postId` is NOT available (no user post)"). The post ID would have to come from the webview context. Redis is the shared state between contexts.

**Why overwrite on each menu invocation (not add to a set):** Mods typically create one canonical launcher post per subreddit. Overwriting is simpler and matches reality. If multiple launcher posts are created, only the most recent is used as the deep link target — acceptable trade-off.

**Lesson:** When the user says "link to the last X post", they usually mean "the canonical post that the app was launched from", not literally "the most recent post with this title". The mental model is: "the post that the Meetit app lives in" — singular, not plural. Track it with a single Redis key, overwrite on creation, fall back gracefully.

### Why the hint text matters (and is the right UX)

When a fresh install has no launcher post, the deep link goes to the subreddit homepage. **Without the hint, a user might think the deep link is broken.** The hint text:

> *Mods: create a "Meetit - Community Meetups" post via the subreddit menu to make this link go straight to the app.*

…turns the fallback into a self-documenting onboarding step. The first mod to see the reminder post understands exactly what to do.

**Lesson:** Fallback paths are user-visible. Always add a one-line hint explaining what the user is seeing and how to fix it. The hint is also a free audit trail — the mod who reads the reminder post knows that no one has clicked "Create Meetit Post" yet.

### Files changed in e26

| File | Change | Lines |
|------|--------|-------|
| `src/shared/meetit.ts` | `buildReminderBody()`: new `mapUrl` field in event Pick, new optional 5th param `meetitAppPostUrl`, mod hint in fallback | +30 |
| `src/server/server.ts` | `onMenuCreatePost()`: persist `post.id` to `meetit:meetit_app_post_id` (try/catch) | +10 |
| `src/server/server.ts` | `onCheckEvents()`: read the key, build URL, pass to `buildReminderBody()` | +10 |
| `tools/meetit-behavior.test.ts` | 7 new tests (3 maps, 4 deep-link) + `mapUrl: undefined` on `FULL_EVENT` | +60 |

### Test coverage added (7 new tests)

**Maps (3):**
- Includes maps section when `event.mapUrl` is set
- Omits maps section when `event.mapUrl` is empty
- Omits maps section when `event.mapUrl` is whitespace

**Deep link (4):**
- Prefers `meetitAppPostUrl` over subreddit homepage
- Falls back to subreddit homepage when `meetitAppPostUrl` is missing
- Falls back to subreddit homepage when `meetitAppPostUrl` is empty string
- Omits the deep link entirely when both subreddit and app post are missing

Total: 35/35 tests pass.

### Cross-references

- `openspec/specs/reminder-system/spec.md` — current spec (now includes e26 requirements)
- `openspec/changes/archive/2026-06-19-e26-reminder-map-and-deeplink/{proposal,design,tasks}.md` — full proposal
- `src/shared/meetit.ts:158` — `buildReminderBody()` (with maps + deep link logic)
- `src/server/server.ts:721` — `onMenuCreatePost()` (writes the Redis key)
- `src/server/server.ts:804` — `onCheckEvents()` (reads the key + builds URL)
- `src/shared/api.ts:9` — `MeetitEvent.mapUrl?: string` type definition
- `app.ts:2287` — `submitEvent()` form submission (where `mapUrl` enters the data flow)
- `app.ts:1034, 1694` — home card and mod detail maps link rendering (for consistency check)

### Pattern: progressive enhancement of a pure function

`buildReminderBody()` has grown over three iterations:
- v1 (e24): `buildReminderBody(event, organizer, mods)` — basic body
- v2 (e24 hotfix): `buildReminderBody(event, organizer, mods, subredditName?)` — added deep link
- v3 (e26): `buildReminderBody(event, organizer, mods, subredditName?, meetitAppPostUrl?)` — added launcher post URL

Each new parameter is **optional and backward-compatible**. Existing callers (none right now, but in the future) can upgrade without touching the call site. This is the **pure-function evolution pattern**: keep the signature growing to the right, never break existing callers, always add tests for the new behavior.

### Verification commands

```bash
# 1. Render the body with all new features enabled
node --experimental-strip-types -e "
import { buildReminderBody, buildReminderTitle } from './src/shared/meetit.ts';
const event = { title: 'Test', date: '2026-06-20', time: '18:00', location: 'Park', description: 'Bring snacks', organizer: 'u/darelphilip', mapUrl: 'https://maps.google.com/?q=Park' };
console.log('TITLE:', buildReminderTitle(event));
console.log('BODY (with launcher post):');
console.log(buildReminderBody(event, 'u/darelphilip', ['modA'], 'meetup_hub2_dev', 'https://www.reddit.com/comments/1uab0cg/'));
console.log('BODY (fallback — no launcher):');
console.log(buildReminderBody(event, 'u/darelphilip', ['modA'], 'meetup_hub2_dev'));
"

# 2. Confirm the Redis key is set after a mod creates a launcher post
# In Devvit: trigger "Create Meetit Post" menu action, then in CRON logs look for:
#   [MENU] Saved meetit_app_post_id=t3_1uab0cg (url=https://www.reddit.com/comments/1uab0cg/)

# 3. Confirm a reminder post deep-links to the launcher
# In CRON logs after the next 5-min tick:
#   [CRON] Reminder post sent for ... (postId=t3_...)
# Open the reminder post → the "Open in Meetit to RSVP" link should go to the launcher post URL, not the subreddit homepage.
```

---

## 51. RSVP Share: User Actions Permission + Draft Preview UX (2026-06-19)

The "I'm going to" social-share feature went through three iterations of design thought, all in one session, before settling on the final approach. This section captures the lessons so future social features don't repeat the mistakes.

### Iteration 1: Single button, no preview (REJECTED)

**First thought:** "Add a Share button. Tap it. Post goes out. Done."

**Why I rejected it:**
- **No User Actions compliance.** Per the [Devvit User Actions docs](https://developers.reddit.com/docs/capabilities/server/userActions), the user must be informed before the app acts on their behalf. A single-button no-preview design has no consent step.
- **No typo protection.** Social-share posts with a typo (or worse, an accidentally-included private field) become permanent public records. The user can't review before posting.
- **No cancel path.** A single button means accidental clicks = accidental public posts under the user's account.

### Iteration 2: User account ONLY (REJECTED)

**Second thought:** "Post under the user's account via `runAs: 'USER'`. Add the `asUser: ['SUBMIT_POST']` permission. No fallback."

**Why I rejected it:**
- **Feature is broken until app review completes.** Per docs: *"requires explicit approval during app review (extends review time)"*. If the app is still pending review, the feature doesn't work AT ALL.
- **No graceful degradation.** A clean failure with no fallback is hostile to users who need the feature.

### Iteration 3 (FINAL): User account + APP fallback + draft preview

**What we shipped:**
1. **Draft preview overlay** — the user always sees the exact post that will be created before confirming.
2. **`runAs: 'USER'` first** — feels authentic, posted under their own account.
3. **APP account fallback** — if `runAs: 'USER'` throws (e.g., permission pending), fall back to `runAs: 'APP'`. Feature works from day 1.
4. **24h Redis dedup** — invisible to the user, prevents accidental double-posts.

This is the **User Actions "always ask permission" + graceful degradation + spam prevention** trifecta.

### Why a draft preview is the right UX (not just a checkbox)

A common alternative to a draft preview is a consent checkbox:

```html
<input type="checkbox" required> I agree to post this on my behalf
```

I rejected this because:
- **Checkboxes are skippable.** Users tap "I agree" without reading. The consent is performative, not informed.
- **A draft preview IS the consent step.** Showing the exact post title + body is more informative than any checkbox. The user reads what they're about to send.
- **It's the same pattern used by Strava, Letterboxd, Spotify Wrapped** — all use draft previews for social-share UX, not checkboxes.

**Lesson:** For "act on my behalf" UX, the preview IS the consent. A separate checkbox is redundant friction.

### The graceful fallback pattern (try USER → fall back to APP)

The `runAs: 'USER'` API is powerful but gated by Reddit's app review. To avoid having a feature that doesn't work until review completes, the handler wraps the USER call in try/catch and falls back to APP:

```ts
let post;
let postedAs: "USER" | "APP" = "USER";
try {
  post = await reddit.submitPost({ title, text, runAs: "USER" });
} catch (e) {
  serverLog("error", `rsvp-share USER fallback: ${errMsg}`);
  post = await reddit.submitPost({ title, text, runAs: "APP" });
  postedAs = "APP";
}
```

The client gets `postedAs` in the response and shows a non-blocking toast:

```ts
var postedAsNote = data.postedAs === "APP" ? " (posted by Meetit — your account posting is pending review)" : "";
showToast("Posted to Reddit! 🎉" + postedAsNote, "success");
```

**Why this works:**
- **Day 1:** Feature works, posts are under the app account, users see a hint about pending review.
- **After app review:** Feature works, posts are under user accounts, the hint disappears.

The user never sees a broken feature.

### 24h dedup prevents both accidental AND malicious double-posts

The dedup key is `meetit:rsvp_share:${eventId}:${username}` with 24h TTL. The user can't share the same event twice in 24 hours, regardless of which account posted.

**Why per-(eventId, username) instead of just per-username:**
- **User RSVPs to event A** → shares it → dedup key set for (A, user)
- **User RSVPs to event B** (different event) → wants to share it → fresh dedup key (B, user) → succeeds
- **Without the eventId in the key**, the user could only share ONE event per 24h, which is too restrictive for active meetup attendees.

**Why 24h and not permanent:**
- Users might want to share an update ("Actually I'm bringing snacks!"). 24h is the right window for "spam prevention" without "permanently locking out re-sharing".

### Why `submitPost` and not `submitCustomPost` for shares

The first instinct might be to use `submitCustomPost` (the Meetit app iframe) for share posts. **Don't.** The share is supposed to be a flat text post that the user's followers can read and engage with. An app iframe:
- Hides the body
- Breaks comment thread UX
- Feels spammy (app posts are often auto-generated)

A plain text post (`submitPost`) is the right call. Same lesson as the e24 reminder system — see §49.

### Why no `userGeneratedContent` on `submitPost` with `runAs: 'USER'`

The Devvit docs and the `submitPost` type signature are inconsistent:
- Docs say `userGeneratedContent` is required for `runAs: 'USER'`
- Type signature only allows it on `submitCustomPost`

**The pragmatic interpretation:** for `submitPost`, the `text` field IS the user-generated content. The platform infers it from the body. Passing `userGeneratedContent` on `submitPost` causes a TypeScript error (`userGeneratedContent does not exist in type`).

**Lesson:** When Devvit docs and types disagree, trust the types. The bundler catches the mismatch at compile time; the docs are aspirational.

### Files changed in e27

| File | Change | Lines |
|------|--------|-------|
| `devvit.json` | Add `"asUser": ["SUBMIT_POST"]` under `permissions.reddit` | +1 |
| `src/shared/api.ts` | Add `RsvpShare: "/api/rsvp-share"` to `ApiEndpoint` enum | +1 |
| `src/shared/meetit.ts` | New `buildRsvpShareBody()` pure function + private `escapeShareMarkdown()` helper | +80 |
| `src/server/server.ts` | New `onRsvpShare()` handler (~70 lines) + response type | +75 |
| `public/app.html` | New `rsvp-share-overlay` markup | +20 |
| `src/client/app.ts` | New `openRsvpSharePreview()` + `confirmRsvpShare()` functions + Share button in RSVP success card + 2 new action cases | +90 |
| `tools/meetit-behavior.test.ts` | 6 new tests | +80 |

### Test coverage added (6 new tests)

- `buildRsvpShareBody returns a title and body for a full event`
- `buildRsvpShareBody omits the maps section when event.mapUrl is empty`
- `buildRsvpShareBody omits the description section when description is empty`
- `buildRsvpShareBody truncates long descriptions to 300 chars with an ellipsis`
- `buildRsvpShareBody strips u/ prefix from username before rendering` (defensive, mirrors e24 hotfix)
- `buildRsvpShareBody falls back to plain footer when subredditName is missing`

Total: 41/41 tests pass.

### Why a client-side preview function in addition to the server-side builder

`buildRsvpShareBody()` is the source of truth (server). But the client also has a `openRsvpSharePreview()` function that re-implements the same rules. **Why duplicate?**

- **The preview is rendered before the user clicks "Post to Reddit"** — it must work WITHOUT a server round-trip. Building it client-side keeps the preview snappy (no loading spinner).
- **The server is still the source of truth** — if the client and server rules ever drift, the user sees the preview, the server builds its own, and the user might see a slightly different post. To prevent this, the client mirrors the server's rules exactly.
- **This is the same pattern as `buildReminderBody()`** — see §50. The client preview is a thin re-implementation; the server is the canonical builder.

**Alternative: pure client + server import:** I could have the client import `buildRsvpShareBody` directly from the shared file via the same import system. But the client uses no imports — it's a single bundled JS file. Importing from `../shared/meetit.ts` would require a build step that we don't have. Re-implementing client-side is the pragmatic choice.

**Lesson:** When the client and server need the same logic, prefer shared modules. When shared modules aren't possible (bundling constraints), re-implement and add a comment cross-referencing the source of truth.

### Cross-references

- `openspec/specs/rsvp-share/spec.md` — current spec
- `openspec/changes/archive/2026-06-19-e27-rsvp-share/{proposal,design,tasks}.md` — full proposal
- `src/shared/meetit.ts:255` — `buildRsvpShareBody()` (current)
- `src/shared/meetit.ts:241` — `escapeShareMarkdown()` private helper
- `src/server/server.ts:427` — `onRsvpShare()` handler
- `src/server/server.ts:167` — response type in `ApiResponse` union
- `src/client/app.ts:2336` — `openRsvpSharePreview()` (client preview)
- `src/client/app.ts:2601` — `confirmRsvpShare()` (client confirm)
- `src/client/app.ts:2059` — Share button in RSVP success card
- `public/app.html:531` — `rsvp-share-overlay` markup
- `devvit.json:25` — `"asUser": ["SUBMIT_POST"]` permission

### Pattern: graceful degradation for permission-gated features

When a feature depends on a permission that may not be approved at deploy time, the right pattern is:

1. **Implement the full feature** assuming the permission is granted.
2. **Wrap the permission-gated call in try/catch.**
3. **Fall back to the non-permissioned alternative** (in this case, `runAs: 'APP'`).
4. **Tell the user what's happening** with a non-blocking toast.
5. **Log the fallback** so you can track when the permission was missing.

This pattern applies to:
- `runAs: 'USER'` for any user-action (post, comment, subscribe)
- Future user-notification features
- Future per-user preferences

The opposite pattern — "ship the feature only after the permission is approved" — is hostile to users who need the feature now and creates a "feature doesn't work" bug report.

---

## 52. Pinned-Bottom Action Row for Modal Confirmations (2026-06-19)

After shipping the e27 RSVP share feature, the user reported "didn't see any share button post rsvp". The button was rendering correctly in the DOM — it was just **below the visible viewport** on small viewports.

### The bug

The RSVP success card was a `flex-direction: column` with `justify-content: flex-start` and the Share button at the **bottom** of the column. On the dev subreddit's iframe (Devvit Web inline view, default height 320px in some clients), the content height was ~328px — taller than the viewport. The Share button and the Copy/Done row were **below the fold**.

Concretely, the original layout was:
- 32px top padding + 56px SVG checkmark + 18px heading + 14px event title + 13px date + 13px location + 44px Share button + 44px Copy/Done row = **~328px** of content stacked top-to-bottom.

The user scrolled or didn't realize the button was below. Either way: **the button is functionally invisible** if it's not in the first 320px.

### The fix

Restructure the success card with a **pinned bottom action row**:

```html
<div style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
  <!-- Scrollable header content -->
  <div style="flex:1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:14px 16px 8px;">
    <svg /> <!-- checkmark -->
    <div>You're on the list!</div>
    <div>Event title</div>
    <div>📅 date</div>
    <div>📍 location</div>
  </div>
  <!-- Pinned button row -->
  <div style="flex-shrink:0; border-top:var(--border); background:#fff; padding:10px 16px 12px;">
    <button>🎉 Share that I'm going</button>
    <div>
      <button>📋 Copy</button>
      <button>Done</button>
    </div>
  </div>
</div>
```

Three key CSS rules make this work:

1. **`flex: 1 1 auto; min-height: 0; overflow-y: auto`** on the header content — the `min-height: 0` is critical, otherwise flex children don't shrink below their content size and the overflow doesn't trigger.
2. **`flex-shrink: 0`** on the button row — keeps the buttons from being squeezed if the parent shrinks.
3. **`border-top: var(--border); background: #fff`** on the button row — gives visual separation from the scrollable content above.

### Why the previous layout was wrong

The original `flex-direction: column; justify-content: flex-start` layout is fine for **simple confirmations** (one button, no action area). But for **multi-action confirmations** (share + copy + done), all three buttons compete for the bottom of the viewport, and the last one loses on small screens.

### Lesson: always pin action rows in modal confirmations

Any confirmation overlay with **more than one action** (primary CTA + secondary actions) should use this pattern:
- **Scrollable content area** (text, images, details)
- **Pinned bottom action row** (always-visible primary + secondary buttons)

This is the same pattern used by:
- iOS Action Sheets (fixed bottom toolbar)
- Material Design bottom sheets (pinned action area)
- Stripe checkout (pinned "Pay" button at bottom)

The alternative — letting content push buttons below the fold — is hostile UX. The user might never know the button exists.

### When this matters most

- **Mobile / inline webview** contexts with fixed heights (Devvit Web, iframes) — viewport is 320-512px by default.
- **Long content** (event title + date + location + description) — easily exceeds viewport.
- **Multi-action confirmations** (more than 2 buttons in a column).

### The general rule

**For confirmations with 2+ actions in a constrained viewport:**
1. Pin the actions at the bottom (`flex-shrink: 0; border-top; background: solid color`).
2. Make the rest scrollable (`flex: 1 1 auto; min-height: 0; overflow-y: auto`).
3. Reduce content sizes aggressively (smaller fonts, smaller checkmark, tighter gaps).
4. Add `text-overflow: ellipsis` to long single-line text (location, URL, etc.) to prevent wraps.

### Why this is in LEARNINGS and not in a new OpenSpec change

The fix is ~20 lines of inline style changes in `app.ts`. No new endpoint, no new behavior, no new permission, no new spec section. Per `LEARNINGS.md` §40, this is a surgical hotfix to the same capability (`rsvp-share`), recorded in the archived proposal for traceability.

### Cross-references

- `openspec/changes/archive/2026-06-19-e27-rsvp-share/proposal.md` — full hotfix section
- `src/client/app.ts:2045-2083` — restructured success card layout
- `public/app.js:2160` — bundled HTML structure
- `LEARNINGS.md §40` — surgical change rule
- `LEARNINGS.md §51` — the e27 feature that shipped this hotfix

---

## 53. Always Ship a Recoverable Entry Point (2026-06-19)

After §52's "pinned-bottom action row" hotfix, the user reported again: *"still didn't see the share button"*. The success card layout was correct on paper but the button was still not visible in the iOS Safari Devvit Web iframe.

### The deeper problem

The success card is a **moment-in-time affordance** — it appears for a few seconds after the user RSVPs, then disappears when they tap Done or close the overlay. If the user doesn't notice the Share button in that window, there's no way to come back to it. They have to:
1. RSVP again (which doesn't make sense, they're already going)
2. Manually compose a new post (defeats the purpose of the feature)
3. Forget about it

This is hostile UX. A feature that the user can only access in a 5-second window after a specific action is a feature that most users will never use.

### The fix: a second, persistent entry point

Added a dedicated Share button in **My Stuff → RSVPs**. This is a **recoverable affordance** — the user can come back to it at any time, browse their RSVPs, and share when they're ready. The My Stuff card always shows the button, regardless of when the user RSVPs.

### When to ship multiple entry points

**Always ship at least one recoverable entry point for any feature that:**
- Has a "in the moment" affordance (toast, success card, confirmation dialog)
- Is destructive or hard to redo (e.g., posting a share — they don't want to RSVP again)
- The user might want to invoke multiple times (e.g., share a different event from My Stuff)

**Examples:**
- Slack: notification + sidebar mention (you can act later)
- GitHub: PR notification + "Your Pull Requests" page
- Reddit: inbox notification + saved posts
- Spotify: "Now Playing" share + your library

### The "two entry points" rule of thumb

| Entry point | Best for | Cost |
|---|---|---|
| Moment-in-time (toast/success card) | Catching the user at peak intent | Low — 1 button |
| Persistent menu (My Stuff/profile) | Catching the user when they come back | Low — 1 button in existing menu |

If both cost 1 button and ~50 lines of code, ship both. The "I'll do it later" user is as important as the "do it now" user.

### The deeper lesson: don't fight the viewport

The §52 fix tried to make the success card button work in a constrained viewport. The §53 fix sidesteps the problem by putting the button somewhere the viewport constraints don't apply (the My Stuff card has its own scrollable container, not a flex middle region).

**Rule of thumb:** When a layout fix requires fighting the platform (iOS Safari iframes, Android webviews, etc.), consider whether the problem is solvable by **moving the action to a different container** that doesn't have the constraint.

### Cross-references

- `openspec/changes/archive/2026-06-19-e27-rsvp-share/proposal.md` — "Post-launch hotfix #2" section
- `src/client/app.ts:629-634` — My Stuff RSVP card actions (2 rows: Share primary, Update + Leave secondary)
- `src/client/app.ts:2350` — `myRsvps` fallback in `openRsvpSharePreview`
- `LEARNINGS.md §52` — the success card layout lesson that didn't fully work
- `LEARNINGS.md §40` — surgical change rule
- `LEARNINGS.md §51` — the e27 feature that shipped both hotfixes

---

## 54. Prune Features That Don't Earn Their Complexity (2026-06-19)

After the §52 and §53 hotfixes for the RSVP share button, the user reported again: *"the share from my stuff worked, but the one on rsvp doesn't. makes sense to remove the rsvp popup"*.

### The situation

The success card Share button had been worked on three times:
- **v1 (shipped)**: simple column with share button at the bottom — share was below the fold
- **v2 (hotfix)**: pinned-bottom action row with nested scrollable header — still clipped on iOS Safari iframe
- **v3 (this)**: removed entirely

After the My Stuff Share button shipped, the user could share reliably from there. The success card share button was now redundant AND broken AND complex. **All three reasons to remove it.**

### The decision: remove the feature, not work around the platform

The natural temptation is to keep trying to make the success card button work. The instinct is: "we already built it, let's make it work." But:

- The My Stuff button **fully covers the use case** (users can share any time)
- The success card button was **inherently constrained** (the iOS Safari iframe viewport bug is not something we can fix from app code)
- The layout was **complex** (~15 lines of nested scroll + pinned row + flex-shrink) for a feature that didn't work

The right call was to **remove the unreliable entry point**, not to keep investing in making it work. The user's feedback was explicit and aligned: "makes sense to remove".

### The lesson: prune, don't polish

**Sometimes the right answer to a broken feature is to delete it, not fix it.**

Heuristics for when to remove a feature:
- It has a working alternative (My Stuff share button)
- It's in a surface you can't control (iOS Safari iframe viewport)
- The fix would require a major overhaul (rebuilding the success card layout from scratch)
- The user is OK with removing it (they explicitly said "makes sense to remove")

When in doubt, ask: *"Is this feature earning its complexity?"* If a feature is 50 lines of code for 0 users (because it's invisible), those 50 lines are a liability, not an asset.

### The compounding cost of "fix it later"

Each iteration added complexity:
- v1: simple HTML, broken
- v2: nested scroll + pinned row + flex-shrink + border-top + max-width, still broken
- v3: removed all of v2's complexity, back to simple

**Two iterations of fixes = a net negative on the codebase.** v1 and v2 added complexity for no user benefit. v3 removed both and simplified the code.

**Lesson:** If a feature fails the first deploy and the fix requires a non-trivial layout change, ask whether the feature should exist before investing in the fix. The cost of a feature that doesn't work is higher than the cost of no feature at all.

### When to keep fighting vs. when to remove

| Keep fighting | Remove |
|---|---|
| The feature is core to the product | The feature has a working alternative |
| The user explicitly wants it | The user is OK with removing it |
| The fix is in our control (CSS, layout) | The fix requires platform changes |
| Other features depend on the layout | The layout is isolated |
| The layout pattern is reusable | The layout is one-off |

The success card share button hit **all 4 of the "Remove" criteria**. The decision was obvious once the user confirmed.

### The general principle

**The best code is no code. The best features are the ones that work in the simplest way.**

If a feature requires 3 iterations of fixes and the user is happy to remove it, **remove it**. The codebase gets simpler, the user gets a cleaner UI, and you free up cycles for the features that actually work.

### Cross-references

- `openspec/changes/archive/2026-06-19-e27-rsvp-share/proposal.md` — "Post-launch hotfix #3" section
- `src/client/app.ts:2050-2083` — simplified success card (no share button, no nested scroll, no pinned row)
- `src/client/app.ts:608` — My Stuff share button (the surviving entry point)
- `LEARNINGS.md §52` — pinned-bottom row pattern (still valid for multi-action confirmations)
- `LEARNINGS.md §53` — recoverable entry point pattern (the real fix that worked)
- `LEARNINGS.md §51` — the e27 feature that shipped all 3 hotfixes
- `LEARNINGS.md §40` — surgical change rule

---

## 55. Auto-RSVP the Organizer (2026-06-22, e28.1)

After several rounds of testing, the user asked: "Organizer should already be rsvod to event they make". The current flow had the organizer submitting an event → mod approving it → the event appearing in `My Stuff → My Events`, but the organizer's own `My Stuff → RSVPs` was empty and the attendee count started at 0.

### Why this was a gap

When you create an event, you obviously intend to be at it. Forcing the organizer to:
1. Wait for mod approval
2. Open the event
3. Tap RSVP
4. Fill the form
5. Submit

...is 4 extra steps for the most "guaranteed attendee" of any event. And the attendee count of 0 makes the event look unpopular to other Redditors who might want to join.

### The fix

After `redis.hSet("meetit:active_events", { [eventId]: eventJson })` in `onApproveEvent`, the server also runs:
```ts
const organizerKey = normalizeUsername(event.organizer || "");
if (organizerKey) {
  await redis.zAdd(`meetit:rsvps:${eventId}`, { score: Date.now(), member: organizerKey });
}
```

`zAdd` is idempotent (overwrites the score for the same member), so re-approving the same event is a no-op. `normalizeUsername` handles the `u/` prefix quirk (the form prefill adds `u/`, so the stored value is `u/organizer` but the rsvps zset uses bare usernames).

### Design decisions

- **Where to do the auto-RSVP**: in `onApproveEvent` (server-side), not `onSubmitEvent` (client-side). Why? Because the event isn't "real" until a mod approves it. If the organizer auto-RSVPed on submit and the mod rejected the event, we'd have a stale zset entry.
- **What about email/phone**: don't pass any. The organizer's contact details are visible to themselves in their `My Stuff → RSVPs`, but the auto-RSVP is "I'm organizing" not "I want to be contacted". The other attendees (and the mod) see the organizer's username but no contact info.
- **My Stuff visibility**: the event appears in BOTH `My Events` (as the organizer) and `My RSVPs` (as an attendee). This matches the user mental model ("I made it, I'm going to it"). The "1 going" count is just the organizer until others RSVP — which is honest and matches the disclosure.

### Cross-references

- `src/server/server.ts:onApproveEvent` — auto-RSVP line
- `openspec/changes/e28-ux-and-social-polish/specs/submit-event-wizard/spec.md` — new requirement
- `LEARNINGS.md §56` — attendee list in posts (related: the auto-RSVPed user now appears in the attendee list)
- `LEARNINGS.md §49` — reminder system history (auto-RSVP works with reminder attendee list)

---

## 56. Show the Attendee List in Posts (2026-06-22, e28.6 + e28.7)

The user asked: "The I'm going post should include the list of others joining me in the post body" and "The reminder post should also include the list of all those going". This is the **social-proof** feature — when you see "u/alice u/bob u/charlie are going", you're more likely to RSVP yourself.

### The cap question

How many attendees to show? Options considered:
- **All of them**: a popular event might have 500+ RSVPs, making the post an unreadable wall of usernames
- **5-10**: too few to demonstrate social proof
- **20 with "+N more"**: matches Reddit comment-thread depth (the "see all replies" link in comment threads uses a similar cap), demonstrates social proof, keeps the post scannable
- **Just the count**: safest privacy-wise but loses the social-discovery value

I went with **20 with "+N more"** per the user's choice. The 20 usernames are:
- Sorted alphabetically (case-insensitive)
- Deduped (case-insensitive — `Alice` and `alice` are the same person)
- `u/` prefix normalized (no `u/u/username` artifacts)

### Server vs client preview

The client-side `openRsvpSharePreview` shows just the count in the preview ("Also going (12)"), not the full list. Why?
- The preview is for the user's review step before posting — they want to confirm "yes, I'm going to this event, here's the date/location/map"
- The actual list is small and predictable — server is source of truth
- Fetching the full list client-side would require a new endpoint just for the preview
- If the count is wrong, the user will see it after posting and can delete + retry (low cost)

### Privacy disclosure update

Added a sentence to the RSVP form disclosure:
> "By RSVPing, your Reddit username may also appear in public event reminder posts and in the event's share post."

This is a soft disclosure (informational, not consent-gated) consistent with the existing pattern. The user already chose to RSVP knowing their username is public (it's visible on the event's attendee list).

### Format

```
## 👥 Also going (12): u/alice u/bob u/charlie ... u/zoe
```

Or for reminders:
```
## 👥 23 going: u/alice u/bob u/charlie ... +3 more
```

The format is intentionally boring — `u/` links render as Reddit auto-links, no fancy markdown. Plain text is the most reliable across all Reddit clients.

### Cross-references

- `src/shared/meetit.ts:formatAttendeeList` — the helper that does sort/dedup/cap
- `src/shared/meetit.ts:buildRsvpShareBody` — adds "Also going" section
- `src/shared/meetit.ts:buildReminderBody` — adds "N going" section
- `src/server/server.ts:onRsvpShare` — fetches attendees, passes to builder
- `src/server/server.ts:onCheckEvents` — batch-fetches attendees via `Promise.all`
- `src/client/app.ts:openRsvpSharePreview` — shows count in preview
- `public/app.html:512` — updated RSVP disclosure
- `openspec/changes/e28-ux-and-social-polish/specs/rsvp-share/spec.md`
- `openspec/changes/e28-ux-and-social-polish/specs/reminder-system/spec.md`
- `LEARNINGS.md §51` — e27 RSVP share feature
- `LEARNINGS.md §49` — reminder system history
- `LEARNINGS.md §55` — auto-RSVP organizer (the data source for this list)

---

## 57. iOS Safari Date/Time Input Alignment (2026-06-22, e28.2)

The user reported: "In iphone the time box is horizontally off". Looking at the screenshot, the DATE and TIME input boxes in the event submission form's step 2 were misaligned — TIME was slightly wider or differently padded.

### The cause

iOS Safari renders `<input type="date">` and `<input type="time">` with different default padding because of the native picker icon (the small calendar/clock icon on the right side of the input). Even with `box-sizing: border-box` and `min-width: 0` on the flex children, the inputs refuse to render at exactly equal widths.

### The fix (two parts)

1. **`appearance: none; -webkit-appearance: none;`** on both `input[type="date"]` and `input[type="time"]` — removes the native picker icon and its padding
2. **`.form-row` from flex to grid** — `display: grid; grid-template-columns: 1fr 1fr; gap: 10px;` — grid columns are guaranteed equal width, no flex quirks

### Why grid is better than flex for 2-col inputs

CSS grid's `1fr 1fr` columns are exactly equal width, no matter what. Flex's `flex: 1; min-width: 0;` should also work, but on iOS Safari, native form inputs can override the flex sizing in subtle ways. Grid doesn't have this problem because it allocates space before content is rendered.

### The lesson

When you have native form inputs (date, time, color, file) in a 2-col layout, prefer grid over flex. Grid is more reliable across browsers because it doesn't interact with the inputs' intrinsic sizing the same way flex does.

### Cross-references

- `public/app.html:234-241` — CSS for date/time inputs and `.form-row` grid
- `openspec/changes/e28-ux-and-social-polish/specs/form-input-alignment/spec.md`
- `LEARNINGS.md §21` — design system tokens (touch targets, safe-area)
- `LEARNINGS.md §52` — pinned-bottom action row (related: another iOS-specific layout lesson)

---

## 58. The "Share Failed / Already Shared" Trap (2026-06-22, e28.8 hotfix)

After deploying e28, the user reported:
> "the first time i click on share, it says share failed and then the next time i click share again it says you have already shared today"

This is a particularly nasty bug because the post **is** being created — the dedup key is set server-side, the user just can't see it. They end up in a state where:
- The post exists in the subreddit
- The dedup key says they shared
- The client says "share failed"
- The next click says "already shared" with no way to find the post they "failed" to create

### The root cause

The server flow in `onRsvpShare`:
1. Dedup check (key not set → pass)
2. Create the post (USER fails, APP succeeds)
3. **Set dedup key** (regardless of post.url)
4. Return `{ success: true, postUrl: post.url, postedAs: "APP" }`

The client flow in `confirmRsvpShare`:
1. Fetch the response
2. Check `data.type === "rsvp-share" && data.success && data.postUrl`
3. If postUrl is missing → fall to the else branch → show "Share failed - retry"

The trap: if `post.url` is somehow undefined (rare platform edge case, or a different submitPost return shape), the server has already set the dedup key but the client can't navigate. The post exists, but the user has no way to find it.

### The fix (3 parts)

**Part 1: Server validates post.url before setting dedup**

```ts
if (!post || !post.url) {
  // Don't set dedup — let the user retry
  return { error: "Post created but URL not available - please retry", status: 500 };
}
await redis.set(dedupKey, "1", { expiration: new Date(...) });
return { type: "rsvp-share", success: true, postUrl: post.url, postedAs };
```

This is the most important fix: **the dedup key is only set when we have a confirmed post with a URL**. If the platform returns a post object without a URL, we bail out and let the user retry.

**Part 2: Client wraps navigateTo in try-catch**

```ts
closeOverlay("rsvp-share-overlay");  // Close FIRST so the user is never stuck
if (data.postUrl) {
  try {
    navigateTo(data.postUrl);
  } catch (navErr) {
    log("navigateTo failed: " + navErr);
    // Don't surface as error — the post IS created, we just can't auto-navigate
  }
}
```

The overlay is closed BEFORE the navigateTo call so even if navigateTo throws, the user isn't left with an open overlay and a dead button.

**Part 3: Client relaxes the postUrl check on the success path**

```ts
if (data.type === "rsvp-share" && data.success) {  // No longer checks postUrl
  // ... show success toast
  // ... close overlay
  // ... try to navigate (may fail gracefully)
}
```

The success path no longer requires `data.postUrl` — if the post is created (server says so), we trust it. The toast confirms success; the navigateTo is best-effort.

### The general lesson

**Server side effects should be atomic.** A dedup key is a side effect that should not be set unless ALL the user-visible effects (post + url) are also in place. Otherwise, the user gets a half-completed action with no way to finish it.

**Client toast logic should never depend on platform internals.** `navigateTo` is a Devvit runtime global — we don't control it. Wrapping it in try-catch is cheap insurance against future platform changes.

### Cross-references

- `src/server/server.ts:onRsvpShare` — post.url validation before dedup
- `src/client/app.ts:confirmRsvpShare` — defensive navigateTo + success path no longer requires postUrl
- `LEARNINGS.md §56` — attendee list in posts (the e28 change that was deployed)
- `LEARNINGS.md §51` — e27 RSVP share (the original feature this builds on)
- `LEARNINGS.md §40` — surgical change rule

---

## 59. Log the New Features, Not Just the Old Ones (2026-06-22, e28.9)

The user asked: "did you add adequate logging for all the new features". An audit of the e28 deployment revealed 5 logging gaps:

| Feature | Was missing | Now logs |
|---------|-------------|----------|
| e28.1 Auto-RSVP organizer | Skip-case (empty organizer field) | `console.warn` + `serverLog("warn", ...)` |
| e28.3 My Stuff 3-button layout | Confirmation that new layout was used | `renderMyRsvpCard e28-layout=3button-rsvp-card` |
| e28.4 My Events rsvpCount | Per-event rsvpCount (only summary) | `[MY-SUBMISSIONS] myEvents-rsvpCount: Title1=3, Title2=7` |
| e28.5 Detail card category at top | Confirmation of layout change | `openDetailsOverlay e28-category-position=top` |
| e28.6 RSVP share attendees | Other attendees count | `[RSVP-SHARE] ... otherAttendees=5 (cap=20)` |
| e28.7 Reminder post attendees | Attendees count per reminder | `[CRON] Reminder post for X attendees=12 (cap=20)` |
| e28.2 iOS TIME box (CSS) | Confirmation that grid is applied | `APP INIT e28-form-row-display=grid` (uses getComputedStyle) |
| Share preview "Also going" count | Count shown to user | `openRsvpSharePreview e28-also-going=5` |

### The principle: tag new-feature logs with a version prefix

Every new e28 log line starts with `e28-` or includes the e28 number in brackets (`[RSVP-SHARE]`, `[MY-SUBMISSIONS]`, etc., with the e28 feature number nearby). This makes it trivial to:
- Filter logs to see only e28 events: `grep "e28-" devvit-cli.log`
- Confirm a feature fired: `grep "myEvents-rsvpCount"` shows the new rsvpCount feature
- Debug regressions: if an old log disappears, the feature might be broken

### Use both `console.log` and `serverLog` for important business events

- `console.log` → visible in `devvit-cli logs` (terminal)
- `serverLog` → visible in the in-app debug panel (developers browsing the app)

For warnings and errors especially, both should be used. The debug panel can be opened by a mod without terminal access, so business events should appear there too.

### Use `getComputedStyle` for CSS-fix verification

For the iOS TIME box fix, the log uses `window.getComputedStyle(formRow).display` to read the actual computed display value. This proves the CSS rule is actually applied in the live DOM, not just present in the source. If the log says `display=flex` instead of `display=grid`, the CSS didn't take effect (caching, specificity, or typo).

### Cross-references

- `src/server/server.ts:onApproveEvent` — auto-RSVP + skip log
- `src/server/server.ts:onMySubmissions` — per-event rsvpCount log
- `src/server/server.ts:onRsvpShare` — otherAttendees log
- `src/server/server.ts:onCheckEvents` — reminder attendees log
- `src/client/app.ts:renderMyRsvpCard` — 3-button layout log
- `src/client/app.ts:openDetailsOverlay` — category position log
- `src/client/app.ts:openRsvpSharePreview` — also-going count log
- `src/client/app.ts:DOMContentLoaded` — form-row display check
- `LEARNINGS.md §55-58` — the e28 features these logs verify

---

## 60. The Debug Panel Privacy Leak (2026-06-22, fix-privacy-issues)

After the e28 deployment, the user reviewed their unified log output and noticed:
```
[SERVER] 14:50:15.928 [API] GET /api/server-logs
[CLIENT] 14:50:14.869 debug panel visible
```

The debug panel was visible to any user — and tapping it returned the last 100 server log entries. This included:
- **Usernames** of other Redditors (from RSVP share attempts, auto-RSVP logs, etc.)
- **Event IDs** (correlatable to specific events)
- **RSVP actions** (who RSVPed to what)
- **Contact-presence flags** (`contact=true/false` in `/api/rsvp-list` logs)
- **Error messages** (sometimes including internal state)

This is the **biggest privacy issue** the app has shipped. Not catastrophic (no email/phone leaks), but enough for targeted abuse.

### The fix: defense in depth across 4 layers

| Layer | Check | What it prevents |
|-------|-------|------------------|
| 1. **HTML** | `style="display: none;"` on `<button id="debug-toggle">` | Non-mods see nothing in the initial DOM |
| 2. **Client click handler** | `if (!cachedHomeIsMod) return;` | DOM manipulation tricks can't bypass the UI |
| 3. **Client fetchServerLogs** | `if (!cachedHomeIsMod) return;` | Avoids the network roundtrip; logs the skip |
| 4. **Server endpoint** | `await requireMod()` | **The actual security boundary** — non-mods get 403 even if they bypass the client |

### What I added to make the fix complete

1. **Server `onInit`**: include `isMod` in the response. This lets the client know mod status at app boot, before `/api/home` returns. Without this, there's a brief window at app start where `cachedHomeIsMod = false` and the panel is correctly hidden — but the moment home loads, the toggle would appear. Having `isMod` in init lets us reveal the toggle earlier if the user opens the event form (which calls `prefillOrganizer` → `onInit`).

2. **Server `onServerLogs`**: added `requireMod()` at the top. Logs the denied access attempt (`[SERVER-LOGS] DENIED access to /api/server-logs for non-mod u/{username}`) for mod review.

3. **Client `applyDebugPanelVisibility()`**: new helper that shows/hides the debug toggle based on `cachedHomeIsMod`. Called from 3 places:
   - `DOMContentLoaded` (initial render)
   - `loadHome` after `cachedHomeIsMod` is set
   - `prefillOrganizer` after `data.isMod` arrives from init

4. **Client guards**: both the click handler and `fetchServerLogs` check `cachedHomeIsMod` and bail out early if false.

### The general lesson

**The security boundary is the server, not the client.** The HTML `display: none` and the client-side checks are nice UX (no flicker, no failed network calls), but they're not the security boundary. A determined user can manipulate the DOM, open dev tools, and call the API directly. The server check is what actually protects the data.

**Hide by default, reveal on permission.** The default state for the debug panel should be "hidden" — not just in CSS, but in the JS handler too. If a non-mod somehow gets the button visible, the handler should return early. The button being visible in the HTML at all is a code smell; the real fix is making sure the server rejects unauthorized requests.

**Log denied access attempts.** A 403 isn't enough — the attempt itself is suspicious. Logging `[SERVER-LOGS] DENIED access for non-mod u/{username}` lets mods review who's trying to access what. Without this log, a misconfigured client could keep failing silently.

### Cross-references

- `src/server/server.ts:onInit` — new `isMod` field
- `src/server/server.ts:onServerLogs` — new `requireMod()` gate
- `src/client/app.ts:applyDebugPanelVisibility` — new helper
- `src/client/app.ts:fetchServerLogs` — new mod guard
- `public/app.html:559` — new `display: none` on toggle
- `openspec/changes/archive/2026-06-22-fix-privacy-issues/` — full spec
- `openspec/specs/server-logs-privacy/spec.md` — permanent spec
- `LEARNINGS.md §1` (surgical change rule) — 6 small changes, not a feature
- `LEARNINGS.md §59` (e28.9 logging) — the `isMod` field flows through the same init response




