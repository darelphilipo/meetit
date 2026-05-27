# Mobile Event Details Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Google Maps and `Who's Going?` reachable on mobile after expanding a long event description.

**Architecture:** Preserve the current three-step details overlay. Add CSS boundaries around the step-2 description region so only the description scrolls, while the action controls remain below it inside the visible content area.

**Tech Stack:** TypeScript client (`src/client/app.ts`), static HTML/CSS shell (`public/app.html`), Node build script.

---

### Task 1: Add Bounded Details Styles

**Files:**
- Modify: `public/app.html`

- [ ] **Step 1: Add detail step CSS**

Add CSS under the existing `/* Detail view */` section:

```css
.detail-card { background: #fff; border: var(--border); box-shadow: var(--shadow-sm); }
.detail-step-card { display: flex; flex-direction: column; gap: 12px; max-height: 100%; min-height: 0; }
.detail-desc { background: #fff; border: var(--border); line-height: 1.45; word-break: break-word; }
.detail-desc-scroll { max-height: min(42vh, 260px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
.detail-actions { flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; }
```

- [ ] **Step 2: Confirm CSS is scoped**

Check that the new classes are only generic detail-view helpers and do not alter home cards, mod cards, or submit-event forms.

### Task 2: Update Details Step Markup

**Files:**
- Modify: `src/client/app.ts`

- [ ] **Step 1: Change the step-2 card wrapper**

Replace:

```ts
var s2 = '<div class="detail-card" style="padding:14px;">';
```

with:

```ts
var s2 = '<div class="detail-card detail-step-card" style="padding:14px;">';
```

- [ ] **Step 2: Make the description independently scrollable**

Replace the description wrapper with:

```ts
s2 += '<div class="detail-desc detail-desc-scroll" style="padding:10px;font-size:14px;margin-top:0;"><span id="desc-short-' + e.id + '">' + escapeHtml(descShort) + (hasMore ? '...' : '') + '</span>';
```

- [ ] **Step 3: Wrap Maps and attendees in an action area**

After closing the description div, add:

```ts
s2 += '<div class="detail-actions">';
```

Then keep the existing Google Maps row and `Who's Going?` button inside that wrapper, and close it before closing the card:

```ts
s2 += '</div></div>';
```

### Task 3: Build and Verify

**Files:**
- Generated: `public/app.js`
- Generated: `public/app.js.map`

- [ ] **Step 1: Build**

Run:

```bash
npm run build
```

Expected: exit code `0`.

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Mobile visual check**

Open the app or a focused local preview at a mobile viewport. Expand a long event description and confirm:

- The description scrolls vertically.
- Google Maps remains reachable.
- `Who's Going?` remains reachable.
- The overlay footer remains visible.
