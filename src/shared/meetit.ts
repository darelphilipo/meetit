import type { MeetitEvent, RsvpAttendee, SubmitEventFormData } from "./api.ts";

export type RsvpEntry = {
  member: string;
  score: number;
};

const CATEGORY_EMOJI: Record<string, string> = {
  social: "🎉",
  tech: "💻",
  sports: "🏃",
  food: "🍕",
  arts: "🎨",
  outdoors: "🌿",
  gaming: "🎮",
  music: "🎵",
  wellness: "🧘",
  education: "📚",
  networking: "🤝",
  other: "⭐",
};

export function isConfiguredModerator(username: string | undefined, modList: unknown): boolean {
  if (!username || typeof modList !== "string" || !modList.trim()) return false;
  const mods = modList
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return mods.includes(username.toLowerCase());
}

export function isSubmissionOwner(username: string | undefined, submittedBy: unknown): boolean {
  if (!username || typeof submittedBy !== "string") return false;
  return normalizeUsername(username) === normalizeUsername(submittedBy);
}

export function buildAttendees(
  results: RsvpEntry[],
  detailsHash: Record<string, string>,
  includeContactDetails: boolean,
): RsvpAttendee[] {
  return results.map((entry) => {
    const attendee: RsvpAttendee = {
      username: entry.member,
      timestamp: entry.score,
    };

    if (!includeContactDetails) return attendee;

    const details = parseRsvpDetails(detailsHash[entry.member]);
    return {
      ...attendee,
      email: details.email,
      phone: details.phone,
    };
  });
}

export function createPendingEvent(
  eventId: string,
  formData: SubmitEventFormData,
  submittedAt: string,
): MeetitEvent {
  return {
    id: eventId,
    title: formData.title,
    date: formData.date,
    time: formData.time,
    location: formData.location,
    description: formData.desc,
    organizer: formData.organizer,
    mapUrl: formData.mapUrl,
    category: formData.category || "other",
    emoji: CATEGORY_EMOJI[formData.category || ""] || CATEGORY_EMOJI["other"],
    submittedAt,
  };
}

function parseRsvpDetails(raw: string | undefined): { email: string; phone: string } {
  if (!raw) return { email: "", phone: "" };
  try {
    const details = JSON.parse(raw) as { email?: unknown; phone?: unknown };
    return {
      email: typeof details.email === "string" ? details.email : "",
      phone: typeof details.phone === "string" ? details.phone : "",
    };
  } catch {
    return { email: "", phone: "" };
  }
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^u\//, "");
}

// pitch-feedback-loop: extract a single query-string parameter from a URL.
// Returns the raw (URL-decoded) value, or undefined if absent. Empty string
// is a valid value (e.g. "?status="). Pure function — safe to unit test.
export function parseQueryParam(rawUrl: string | undefined, name: string): string | undefined {
  if (!rawUrl) return undefined;
  const q = rawUrl.indexOf("?");
  if (q === -1) return undefined;
  const search = rawUrl.substring(q + 1);
  for (const pair of search.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.substring(0, eq);
    if (key !== name) continue;
    const raw = eq === -1 ? "" : pair.substring(eq + 1);
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
  return undefined;
}

// pitch-feedback-loop: strip the query string from a URL, returning just
// the path. Used to route `/api/foo?status=pending` to the `foo` handler.
export function stripQueryString(rawUrl: string | undefined): string {
  if (!rawUrl) return "/";
  const q = rawUrl.indexOf("?");
  return q === -1 ? rawUrl : rawUrl.substring(0, q);
}

// pitch-feedback-loop: normalize a pitch's effective status. Legacy pitches
// (no `status` field, written before this change) are treated as "pending".
// Pure function — safe to unit test.
export function pitchEffectiveStatus(idea: any): "pending" | "dismissed" {
  return idea && idea.status === "dismissed" ? "dismissed" : "pending";
}

// pitch-feedback-loop: validate a mod-supplied dismiss reason. Returns an
// error message for invalid input, or null if valid. Rules:
//   - non-empty after trim
//   - 100 characters or fewer
export function validateDismissReason(reason: unknown): string | null {
  if (typeof reason !== "string") return "Reason required";
  const trimmed = reason.trim();
  if (trimmed.length === 0) return "Reason required";
  if (trimmed.length > 100) return "Reason must be 100 characters or less";
  return null;
}

/**
 * The maximum number of attendee usernames rendered in a share/reminder post.
 * Beyond this cap, posts show "+X more" instead of bloating the body.
 * Matches Reddit comment depth conventions; 20 is enough to demonstrate
 * social proof without overwhelming the post.
 */
export const ATTENDEE_LIST_CAP = 20;

/**
 * Format a list of attendee usernames for inclusion in a public post body.
 *
 * - Strips any leading `u/` prefix from each username (idempotent).
 * - Dedupes (case-insensitive — `Alice` and `alice` are the same person).
 * - Sorts alphabetically, case-insensitive.
 * - Caps at `ATTENDEE_LIST_CAP`; if more, appends ` +N more`.
 * - Empty / null input returns `""` (caller should treat as "no section").
 *
 * Used by `buildRsvpShareBody` and `buildReminderBody` to keep the formatting
 * rules consistent across both posts.
 *
 * @param attendees  Array of Reddit usernames (with or without `u/` prefix)
 * @returns          A markdown-safe string like `u/alice u/bob +18 more` or `""`
 */
export function formatAttendeeList(attendees: readonly string[]): string {
  if (!Array.isArray(attendees) || attendees.length === 0) return "";
  // Dedupe by normalized username; preserve the first occurrence's display
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of attendees) {
    const name = stripUsernamePrefix(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(name);
  }
  if (clean.length === 0) return "";
  // Sort case-insensitive alphabetical — consistent ordering is more scannable
  clean.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const limited = clean.slice(0, ATTENDEE_LIST_CAP);
  const list = limited.map((n) => `u/${n}`).join(" ");
  const more = clean.length - limited.length;
  return more > 0 ? `${list} +${more} more` : list;
}

/**
 * Escapes a value for safe CSV output.
 *
 * - Wraps the value in double quotes (RFC 4180).
 * - Escapes any internal double quote by doubling it.
 * - Prepends a single quote to values that start with `=`, `+`, `-`, `@`,
 *   tab, or carriage return to prevent CSV formula injection
 *   (https://owasp.org/www-community/attacks/CSV_Injection).
 *
 * Null/undefined values are returned as an empty quoted string `""`.
 */
export function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  let v = String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
}

/**
 * Strip a leading `u/` (case-insensitive) from a Reddit username. Idempotent.
 * Returns "" for null/undefined/whitespace input. Defensive — works whether
 * the caller passes `u/alice`, `U/alice`, or `alice`.
 */
function stripUsernamePrefix(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (/^u\//i.test(s)) s = s.slice(2).trim();
  return s;
}

/**
 * Build a Google Calendar "Add Event" URL from a Meetit event. Pure function —
 * no Devvit imports, no context, no I/O. Safe to unit-test with `node:test`.
 *
 * The returned URL opens Google Calendar's "Add Event" page with the event's
 * title, start date+time, end date+time (start + 1 hour), location, and
 * description prefilled. Users see Reddit's native external-link confirmation
 * dialog when clicking the link in a post body, then land on Google Calendar
 * in their browser (no Devvit webview involved — works on iOS, Android, and
 * desktop Reddit clients).
 *
 * Date conversion: the event's `date` (YYYY-MM-DD) and `time` (HH:MM) are
 * interpreted as local time in the supplied `timezone` offset string (e.g.,
 * `"+05:30"` or `"-05:00"`). The resulting Date is converted to UTC for the
 * Google Calendar `dates` parameter format (`YYYYMMDDTHHMMSSZ`).
 *
 * End time: defaults to start + 1 hour. Events don't have an end-time field.
 *
 * URL length: Google Calendar accepts URLs up to ~8000 chars. Long descriptions
 * are NOT truncated here — callers should truncate if needed. The Maps URL is
 * appended to the description (separated by `\n\n🗺️ `) when present, which adds
 * a small amount of length.
 *
 * @param event     The MeetitEvent (title, date, time, location, description, mapUrl)
 * @param timezone  Timezone offset string like `"+05:30"` (defaults to IST)
 * @returns         A fully-formed Google Calendar URL, or `""` if `date` is missing
 */
export function buildGoogleCalendarUrl(
  event: Pick<MeetitEvent, "title" | "date" | "time" | "location" | "description" | "mapUrl">,
  timezone: string = "+05:30",
): string {
  if (!event || !event.date) return "";
  const tz = timezone || "+05:30";
  const time = event.time || "00:00";
  // Parse local date+time in the supplied timezone, then to UTC.
  const startLocal = new Date(event.date + "T" + time + ":00" + tz);
  // Defensive: if the date string is malformed, return empty rather than producing a bogus URL.
  if (isNaN(startLocal.getTime())) return "";
  // End time defaults to start + 1 hour.
  const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
  // Google Calendar `dates` format: YYYYMMDDTHHMMSSZ (UTC) joined with `/`.
  // toISOString() gives 2026-06-26T17:20:00.000Z — strip dashes/colons/dots.
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  let details = event.description || "";
  if (event.mapUrl) details += (details ? "\n\n" : "") + "🗺️ " + event.mapUrl;
  // Build the URL manually with encodeURIComponent for proper percent-encoding
  // (spaces → %20, not +). URLSearchParams is not available in the shared
  // tsconfig (it lives in the DOM lib, not ES2023) and would also encode
  // spaces as `+` which is technically valid but less readable in tests.
  const base = "https://calendar.google.com/calendar/render?";
  const enc = (v: string) => encodeURIComponent(v);
  const qs = [
    "action=TEMPLATE",
    "text=" + enc(event.title || "Meetit Event"),
    "dates=" + fmt(startLocal) + "/" + fmt(endLocal),
    "location=" + enc(event.location || ""),
    "details=" + enc(details),
  ].join("&");
  return base + qs;
}

/**
 * Build a markdown body for a reminder post. Pure function — no Devvit imports,
 * no context, no I/O. Safe to unit-test with `node:test`.
 *
 * The body uses Reddit's standard markdown (which renders inside a `submitPost`
 * text post on every Reddit client):
 *   - `## heading` for section headers
 *   - `**bold**` for emphasis
 *   - `u/username` for auto-linking usernames
 *   - `[text](url)` for deep links
 *   - emojis render natively
 *
 * Empty fields are skipped entirely (no blank sections) so the body stays
 * scannable for events that are partially filled in.
 *
 * **Username normalization:** the `organizer` and `mods` parameters accept
 * usernames with OR without a leading `u/` prefix. Any leading `u/` is stripped
 * internally before re-prefixing, so the rendered body always has exactly one
 * `u/` per username. This handles legacy form data where users typed
 * `u/theirname` and the organizer prefill which also adds `u/`.
 *
 * **Deep link:** the "Open in Meetit to RSVP" link prefers `meetitAppPostUrl`
 * (the most recent Meetit app launcher post) when available, and falls back
 * to the subreddit homepage with a hint for mods when not.
 *
 * **Attendee list (e28):** the `attendees` parameter is the full list of users
 * who have RSVPed (including the organizer if auto-RSVPed by e28). Capped at
 * 20 usernames + "+N more". Empty array → section omitted entirely.
 *
 * @param event             The MeetitEvent being reminded about
 * @param organizer         The organizer username (with or without `u/` prefix).
 *                          If empty, pass the fallback username (e.g. `context.username`
 *                          or the app account) so the body always has a contact line.
 * @param mods              List of moderator usernames (with or without `u/` prefix).
 *                          Empty array → no "Moderators:" line.
 * @param attendees         List of RSVPed usernames (with or without `u/` prefix).
 *                          Empty array → no "N going" line. Capped at 20 + "+N more".
 * @param subredditName     The subreddit name (without `r/` prefix). Used as the
 *                          fallback deep-link target when no Meetit app post is known.
 *                          When neither is provided, the deep link section is omitted.
 * @param meetitAppPostUrl  Optional. The full URL of the most recent Meetit app
 *                          launcher post. When provided, the "Open in Meetit" link
 *                          points here instead of the subreddit homepage.
 * @returns                 A markdown string ready to pass to `submitPost({ text })`.
 */
export function buildReminderBody(
  event: Pick<MeetitEvent, "title" | "date" | "time" | "location" | "description" | "organizer" | "mapUrl">,
  organizer: string,
  mods: readonly string[],
  attendees: readonly string[] = [],
  subredditName?: string,
  meetitAppPostUrl?: string,
): string {
  const sections: string[] = [];

  sections.push(`## 📅 ${event.date || "TBD"}`);
  sections.push(`## ⏰ ${event.time || "TBD"}`);

  if (event.location && event.location.trim()) {
    sections.push(`## 📍 ${event.location.trim()}`);
  }

  // Google Maps link (e26): render only if event.mapUrl is present and non-empty.
  // We do not validate the URL — the form is the trust boundary.
  const mapUrl = event.mapUrl && event.mapUrl.trim();
  if (mapUrl) {
    sections.push(`## 🗺️ [Open in Google Maps](${mapUrl})`);
  }

  // e31: Google Calendar "Add Event" link. Inline in the post body (not a
  // button) because the Devvit webview sandbox blocks external navigation
  // (window.open / window.location.href crash the post iframe). The link is
  // rendered in the native Reddit client where external links work fine.
  // Section is omitted when event.date is missing or the URL can't be built.
  const calendarUrl = buildGoogleCalendarUrl(event);
  if (calendarUrl) {
    sections.push(`## 📅 [Add to Google Calendar](${calendarUrl})`);
  }

  if (event.description && event.description.trim()) {
    sections.push(`## 📝 About this event\n${event.description.trim()}`);
  }

  // e28: Going-now list (RSVPed attendees). Capped at 20 + "+N more".
  // Public by design — RSVPing is consent to appear in this public list.
  const goingList = formatAttendeeList(attendees);
  if (goingList) {
    sections.push(`## 👥 ${attendees.length} going: ${goingList}`);
  }

  // Normalize organizer + mod list: strip any leading `u/` before re-prefixing.
  // This is defensive — the form prefill adds `u/` (`app.ts:prefillOrganizer`)
  // and users can also type `u/theirname` manually, so legacy data may have
  // a leading `u/`. We never want `u/u/username` in the rendered body.
  const cleanOrganizer = stripUsernamePrefix(organizer);
  const cleanMods = mods
    .map((m) => stripUsernamePrefix(m))
    .filter((m) => m.length > 0);

  // Separator + organizer + mods + CTA
  sections.push("---");
  if (cleanOrganizer) {
    sections.push(`**Organized by:** u/${cleanOrganizer}`);
  }

  if (cleanMods.length > 0) {
    sections.push(`**Moderators:** ${cleanMods.map((m) => `u/${m}`).join(" ")}`);
  }

  // Deep link to Meetit app (e26): prefer launcher post URL when known,
  // fall back to subreddit homepage with a hint for mods.
  const cleanSubreddit = subredditName && subredditName.trim();
  if (meetitAppPostUrl && meetitAppPostUrl.trim()) {
    sections.push("---");
    sections.push(`🚀 **[Open in Meetit to RSVP](${meetitAppPostUrl.trim()})**`);
  } else if (cleanSubreddit) {
    sections.push("---");
    sections.push(`🚀 **[Open in Meetit to RSVP](https://www.reddit.com/r/${cleanSubreddit})**`);
    sections.push("*Mods: create a \"Meetit - Community Meetups\" post via the subreddit menu to make this link go straight to the app.*");
  }

  sections.push("---");
  sections.push("💬 Drop a comment if you're going, ask questions, or coordinate rides!");

  return sections.join("\n\n");
}

/**
 * Build the title for a reminder post. Pure function — no Devvit imports,
 * no I/O. Safe to unit-test with `node:test`.
 *
 * Format: `${prefix} ${title} — ${date} @ ${location}`
 *
 * - The `@ ${location}` suffix is omitted when the location is empty/whitespace.
 * - The date and title fall back to "TBD" when missing (mirrors body builder behavior).
 * - The `prefix` defaults to "🔔 Event Reminder:" (24h reminder). The 2h reminder
 *   uses "⏰ Starting Soon:" via the optional prefix parameter. Both windows share
 *   the same body format — only the title differs.
 *
 * @param event   The MeetitEvent being reminded about
 * @param prefix  Title prefix. Defaults to "🔔 Event Reminder:" for backwards
 *                compatibility. Use "⏰ Starting Soon:" for the 2h window.
 * @returns       A title string ready to pass to `submitPost({ title })`.
 */
export function buildReminderTitle(
  event: Pick<MeetitEvent, "title" | "date" | "location">,
  prefix: string = "🔔 Event Reminder:",
): string {
  const title = event.title || "TBD";
  const date = event.date || "TBD";
  const location = event.location && event.location.trim();
  return location
    ? `${prefix} ${title} — ${date} @ ${location}`
    : `${prefix} ${title} — ${date}`;
}

/**
 * The maximum length (in characters) of a description included in a share post.
 * Social-share posts that look like essays don't get engagement. Longer
 * descriptions are truncated to this length with a trailing "…".
 */
const RSVP_SHARE_DESCRIPTION_MAX = 300;

/**
 * Escape Reddit-flavored markdown special characters in user-supplied text.
 * Conservative: only escapes chars that have semantic meaning in `## headings`,
 * `**bold**`, `[text](url)`, and `> blockquote`. Apostrophes and quotes are
 * NOT escaped (they don't break Reddit rendering in the share-post context).
 *
 * The intent is to prevent an event titled "Meet & [greet]" from rendering as
 * a malformed link or a "missing link target" error, while still allowing
 * natural prose to render naturally.
 */
function escapeShareMarkdown(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\") // backslash first (escape escape)
    .replace(/\[/g, "\\[") // [text](url) — escape [ to prevent link parsing
    .replace(/\]/g, "\\]") // and ] to keep the bracket pair consistent
    .replace(/\*/g, "\\*") // *bold* / *italic*
    .replace(/_/g, "\\_") // _italic_ / __bold__
    .replace(/^#/gm, "\\#") // # heading at line start
    .replace(/^>/gm, "\\>"); // > blockquote at line start
}

/**
 * Build the title + body for a "u/${username} is going to ..." share post.
 * Pure function — no Devvit imports, no I/O. Safe to unit-test with `node:test`.
 *
 * Title format: `u/${username} is going to ${event.title} (${event.date})`
 *
 * Body format (sections joined with double newlines):
 *   ## 📅 ${date} at ${time}
 *   ## 📍 ${location}
 *   ## 🗺️ [Open in Google Maps](${mapUrl})   *(omitted if no mapUrl)*
 *   ## 📝 ${description}                       *(omitted if empty; truncated if > 300 chars)*
 *   ## 👥 Also going (N): u/user1 u/user2 ...  *(omitted if no other attendees; capped at 20 + "+X more")*
 *   ---
 *   Posted via [Meetit](${subredditUrl}).
 *
 * Username normalization: the `username` parameter accepts a username with OR
 * without a leading `u/` prefix. Any leading `u/` is stripped internally before
 * re-prefixing. This handles the form prefill `u/` quirk (see LEARNINGS §49).
 *
 * Markdown safety: the event title and description are escaped to prevent
 * unintended markdown formatting. Date/time/location/mapUrl are passed through
 * as-is because they come from a trusted source (the form), but if a future
 * change makes any of those user-editable on the share path, add them to
 * `escapeShareMarkdown` too.
 *
 * @param event           The MeetitEvent being shared
 * @param username        The Reddit username (with or without `u/` prefix)
 * @param otherAttendees  Array of other attendees' usernames (with or without
 *                        `u/` prefix). Excludes the current user. Empty/missing
 *                        → the "Also going" section is omitted entirely.
 * @param subredditName   The subreddit name (without `r/` prefix). Optional.
 *                        When provided, a "Posted via Meetit" footer links back
 *                        to the subreddit. When omitted, the footer is just
 *                        "Posted via Meetit" with no link.
 * @returns               `{ title, body }` — both fields ready to pass to
 *                        `reddit.submitPost({ title, text, ... })`.
 */
export function buildRsvpShareBody(
  event: Pick<MeetitEvent, "title" | "date" | "time" | "location" | "description" | "mapUrl">,
  username: string,
  otherAttendees: readonly string[] = [],
  subredditName?: string,
): { title: string; body: string } {
  const cleanUsername = stripUsernamePrefix(username) || "anonymous";
  const safeTitle = escapeShareMarkdown(event.title || "this event");
  const date = event.date || "TBD";
  const title = `u/${cleanUsername} is going to ${safeTitle} (${date})`;

  const bodyParts: string[] = [];

  // Date + time
  if (event.date || event.time) {
    bodyParts.push(`## 📅 ${event.date || "TBD"}${event.time ? " at " + event.time : ""}`);
  }

  // Location
  if (event.location && event.location.trim()) {
    bodyParts.push(`## 📍 ${event.location.trim()}`);
  }

  // Google Maps link (omitted if no mapUrl)
  const mapUrl = event.mapUrl && event.mapUrl.trim();
  if (mapUrl) {
    bodyParts.push(`## 🗺️ [Open in Google Maps](${mapUrl})`);
  }

  // e31: Google Calendar "Add Event" link. Same rationale as in
  // buildReminderBody — Devvit webview sandbox blocks external navigation,
  // so the link goes in the post body where it renders in the native
  // Reddit client. Omitted when date is missing or URL can't be built.
  const calendarUrl = buildGoogleCalendarUrl(event);
  if (calendarUrl) {
    bodyParts.push(`## 📅 [Add to Google Calendar](${calendarUrl})`);
  }

  // Description (truncated to 300 chars; escaped; omitted if empty)
  if (event.description && event.description.trim()) {
    let desc = event.description.trim();
    if (desc.length > RSVP_SHARE_DESCRIPTION_MAX) {
      desc = desc.substring(0, RSVP_SHARE_DESCRIPTION_MAX).trimEnd() + "…";
    }
    bodyParts.push(`## 📝 ${escapeShareMarkdown(desc)}`);
  }

  // e28: Other attendees (excluding the current user). Capped at 20 with "+N more".
  // Public by design — RSVPing means opting in to the public attendee list
  // (see RSVP disclosure text). Sorted alphabetically for scannability.
  const otherList = formatAttendeeList(otherAttendees);
  if (otherList) {
    const total = otherAttendees.length;
    bodyParts.push(`## 👥 Also going (${total}): ${otherList}`);
  }

  // Footer
  const cleanSubreddit = subredditName && subredditName.trim();
  if (cleanSubreddit) {
    bodyParts.push("---\n\nPosted via [Meetit](https://www.reddit.com/r/" + cleanSubreddit + ").");
  } else {
    bodyParts.push("---\n\nPosted via Meetit.");
  }

  return { title, body: bodyParts.join("\n\n") };
}
