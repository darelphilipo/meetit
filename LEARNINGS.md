# Devvit App Development: Learnings & Workflow

> **Project:** Meetit - Community Meetup Manager for Reddit
> **Stack:** Devvit Web (TypeScript + HTML/CSS), Redis, Scheduler
> **Design:** Stitch Neo-Brutalist (Space Grotesk, neon yellow/hot pink, hard shadows)

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
