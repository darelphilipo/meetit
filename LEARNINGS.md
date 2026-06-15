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
- `BUG_REGISTRY.md` — bug list (all entries fixed; historical).
- `ENHANCEMENTS.md` — feature backlog (now in `openspec/changes/`).
- `AUDIT.md` — full app audit (~34 still open, now in `openspec/changes/`).

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
