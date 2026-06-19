## Why

`splitTextToPages` (`app.ts:691-710`) uses a measurement div with `font-size:15px` hardcoded. But the description is rendered at different font sizes depending on context:

- **User event details overlay** (`buildDescPagesHTML` at line 716): `font-size:15px` ✅
- **Mod card** (`.card-body` in `app.html`): `font-size:14px` ❌
- **My Stuff card**: `font-size:13px` ❌

When the measurement div uses 15px but the actual render uses 14px or 13px, the measurement thinks more text fits per line than actually does. The result: page splits are slightly wrong — slightly more text per page than fits, causing minor overflow at the bottom of each page.

## Priority: 2/5

## Status: proposed

## Audit (2026-06-19)

**Bug is still present.** Current code at `app.ts:759-778`:
```ts
function splitTextToPages(text: string, width: number, maxHeight: number): string[] {
  if (!_measureDiv) {
    _measureDiv = document.createElement("div");
    _measureDiv.style.cssText = "position:absolute;left:-9999px;top:0;font-size:15px;...";  // hardcoded 15px
    document.body.appendChild(_measureDiv);
  }
  // ... no fontSize parameter
}
```

All 5 call sites still pass 3 arguments with no fontSize parameter. Font size mismatch causes minor overflow at page bottoms in mod card (14px) and My Stuff card (13px) contexts.

**Recommendation:** ~15 minutes. Add fontSize param + update 5 call sites. Tasks: 0/31 — all still pending.

## What Changes

- Add a `fontSize` parameter to `splitTextToPages(text, width, maxHeight, fontSize)`.
- Set `_measureDiv.style.fontSize = fontSize + "px"` before measuring.
- Update all 5 call sites to pass the appropriate font size:
  - `15` for home/details overlay (current behavior)
  - `14` for mod card descriptions
  - `13` for My Stuff card descriptions
- Add a default of `15` so the signature is backward-compatible.

## Capabilities

### New Capabilities
- `desc-pagination-accuracy`: `splitTextToPages` accepts a `fontSize` parameter so page splits match the actual render font size.

### Modified Capabilities
- None.

## Impact

- `src/client/app.ts`: update `splitTextToPages` signature + 5 call sites.

## Code Sketch (after fix)

```ts
function splitTextToPages(text: string, width: number, maxHeight: number, fontSize: number = 15): string[] {
  if (!_measureDiv) {
    _measureDiv = document.createElement("div");
    _measureDiv.style.cssText = "position:absolute;left:-9999px;top:0;line-height:1.5;font-family:'Space Grotesk',sans-serif;padding:14px;word-break:break-word;white-space:pre-wrap;visibility:hidden;";
    document.body.appendChild(_measureDiv);
  }
  _measureDiv.style.width = width + "px";
  _measureDiv.style.fontSize = fontSize + "px";
  // ... rest unchanged
}
```

Call sites:
- `app.ts:505` (My Stuff) → pass `13`
- `app.ts:542` (My Stuff) → pass `13`
- `app.ts:586` (My Stuff) → pass `13`
- `app.ts:1034, 1043` (mod card) → pass `14`
- `app.ts:1383, 1393, 1788, 1903` (user details / mod detail) → pass `15` (or omit for default)

## Why 2/5

Minor visual issue, not a functional bug. Slightly too much text per page. The fix is a single parameter added to one function + 5 caller updates. Cosmetic but worth doing.
