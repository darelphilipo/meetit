import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnnouncementTitle,
  buildApproveDm,
  buildAttendees,
  buildCleanupLogEntry,
  buildGoogleCalendarUrl,
  buildReminderBody,
  buildReminderTitle,
  buildRsvpShareBody,
  createPendingEvent,
  csvEscape,
  decideDebugPanelVisibility,
  formatAttendeeList,
  isConfiguredModerator,
  isEventAgedOut,
  isPitchAgedOut,
  isSubmissionOwner,
  normalizeUsername,
  parseQueryParam,
  pickAgedItems,
  pitchEffectiveStatus,
  stripQueryString,
  validateDismissReason,
} from "../src/shared/meetit.ts";

test("isConfiguredModerator only allows configured usernames", () => {
  assert.equal(isConfiguredModerator("DarelPhilip", "alice, darelphilip"), true);
  assert.equal(isConfiguredModerator("mallory", "alice, darelphilip"), false);
  assert.equal(isConfiguredModerator("", "alice"), false);
});

test("buildAttendees hides contact details unless requested", () => {
  const attendees = buildAttendees(
    [{ member: "alice", score: 10 }],
    { alice: JSON.stringify({ email: "a@example.com", phone: "123" }) },
    false,
  );

  assert.deepEqual(attendees, [{ username: "alice", timestamp: 10 }]);
});

test("buildAttendees includes contact details for private mod views", () => {
  const attendees = buildAttendees(
    [{ member: "alice", score: 10 }],
    { alice: JSON.stringify({ email: "a@example.com", phone: "123" }) },
    true,
  );

  assert.deepEqual(attendees, [
    { username: "alice", timestamp: 10, email: "a@example.com", phone: "123" },
  ]);
});

test("createPendingEvent records submission time for scheduler alerts", () => {
  const event = createPendingEvent(
    "event_1",
    {
      title: "Picnic",
      organizer: "u/alice",
      date: "2026-06-01",
      time: "10:00",
      location: "Park",
      desc: "Bring snacks",
      mapUrl: "",
    },
    "2026-05-27T12:00:00.000Z",
  );

  assert.equal(event.submittedAt, "2026-05-27T12:00:00.000Z");
});

test("isSubmissionOwner matches usernames with optional u prefix", () => {
  assert.equal(isSubmissionOwner("alice", "u/alice"), true);
  assert.equal(isSubmissionOwner("alice", "Alice"), true);
  assert.equal(isSubmissionOwner("alice", "bob"), false);
});

test("normalizeUsername creates stable RSVP member keys", () => {
  assert.equal(normalizeUsername("DarelPhilip"), "darelphilip");
  assert.equal(normalizeUsername("u/DarelPhilip"), "darelphilip");
  assert.equal(normalizeUsername("  u/Alice  "), "alice");
});

test("csvEscape wraps plain strings in double quotes", () => {
  assert.equal(csvEscape("alice"), '"alice"');
  assert.equal(csvEscape("hello world"), '"hello world"');
});

test("csvEscape handles commas, quotes, and newlines per RFC 4180", () => {
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape('a"b'), '"a""b"');
  assert.equal(csvEscape("line1\nline2"), '"line1\nline2"');
});

test("csvEscape prevents formula injection for dangerous leading characters", () => {
  assert.equal(csvEscape("=cmd|'/c calc'!A1"), '"\'=cmd|\'/c calc\'!A1"');
  assert.equal(csvEscape("@SUM(A1:A2)"), '"\'@SUM(A1:A2)"');
  assert.equal(csvEscape("+1+1"), '"\'+1+1"');
  assert.equal(csvEscape("-2+3"), '"\'-2+3"');
  assert.equal(csvEscape("\tinjected"), '"\'\tinjected"');
  assert.equal(csvEscape("\rmalicious"), '"\'\rmalicious"');
});

test("csvEscape returns empty quoted string for null and undefined", () => {
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
  assert.equal(csvEscape(""), '""');
});

// =====================================================================
// buildReminderBody — reminder post markdown builder (e24)
// =====================================================================

const FULL_EVENT = {
  title: "Bangalore Tech Chai",
  date: "2026-06-21",
  time: "18:30",
  location: "Koramangala Social",
  description: "Lightning talks and demoing side projects.",
  organizer: "alice",
  mapUrl: undefined as string | undefined,
};

test("buildReminderBody includes all sections for a fully populated event", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", ["DarelPhilip", "ModTwo"], []);
  assert.match(body, /## 📅 2026-06-21/);
  assert.match(body, /## ⏰ 18:30/);
  assert.match(body, /## 📍 Koramangala Social/);
  assert.match(body, /## 📝 About this event/);
  assert.match(body, /Lightning talks and demoing side projects\./);
  assert.match(body, /\*\*Organized by:\*\* u\/alice/);
  assert.match(body, /\*\*Moderators:\*\* u\/DarelPhilip u\/ModTwo/);
  assert.match(body, /💬 Drop a comment/);
  // Sections should be separated by blank lines for readability
  assert.match(body, /\n\n/);
});

test("buildReminderBody omits description section when description is empty", () => {
  const body = buildReminderBody(
    { ...FULL_EVENT, description: "" },
    "alice",
    [],
  );
  assert.doesNotMatch(body, /## 📝 About this event/);
  // Date/time/location should still be present
  assert.match(body, /## 📅 2026-06-21/);
  assert.match(body, /## ⏰ 18:30/);
  assert.match(body, /## 📍 Koramangala Social/);
});

test("buildReminderBody uses fallback organizer when event.organizer is empty", () => {
  const body = buildReminderBody(
    { ...FULL_EVENT, organizer: "" },
    "fallback-user",
    [],
  );
  // Organizer line should use the fallback username, not be empty
  assert.match(body, /\*\*Organized by:\*\* u\/fallback-user/);
  // Should NOT contain an empty u/ (i.e., "u/" with nothing after it)
  assert.doesNotMatch(body, /\*\*Organized by:\*\* u\/(\s|$)/);
});

test("buildReminderBody omits Moderators line when mods array is empty", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], []);
  assert.doesNotMatch(body, /\*\*Moderators:\*\*/);
  // Organizer line should still be present
  assert.match(body, /\*\*Organized by:\*\* u\/alice/);
});

test("buildReminderBody omits location section when location is whitespace", () => {
  const body = buildReminderBody(
    { ...FULL_EVENT, location: "   " },
    "alice",
    [],
  );
  assert.doesNotMatch(body, /## 📍/);
});

test("buildReminderBody always includes the CTA line", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], []);
  assert.match(body, /💬 Drop a comment if you're going, ask questions, or coordinate rides!/);
});

test("buildReminderBody renders mod list as u/username mentions separated by spaces", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", ["modA", "modB", "modC"], []);
  const modLine = body.split("\n\n").find((s) => s.startsWith("**Moderators:**"));
  assert.ok(modLine, "Moderators line should exist");
  assert.equal(modLine, "**Moderators:** u/modA u/modB u/modC");
});

test("buildReminderBody includes a subreddit deep link when subredditName is provided", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], [], "meetup_hub2_dev");
  assert.match(body, /🚀 \*\*\[Open in Meetit to RSVP\]\(https:\/\/www\.reddit\.com\/r\/meetup_hub2_dev\)\*\*/);
});

test("buildReminderBody omits the deep link when subredditName is missing", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], []);
  assert.doesNotMatch(body, /🚀 \*\*\[Open in Meetit/);
});

// =====================================================================
// buildReminderBody — username prefix normalization (e24 hotfix)
// =====================================================================

test("buildReminderBody strips a leading u/ from organizer before re-prefixing", () => {
  // The form prefill adds `u/`, so legacy data may store `u/darelphilip`.
  // We must never render `u/u/darelphilip`.
  const body = buildReminderBody(FULL_EVENT, "u/darelphilip", [], []);
  assert.match(body, /\*\*Organized by:\*\* u\/darelphilip/);
  assert.doesNotMatch(body, /u\/u\//);
});

test("buildReminderBody is case-insensitive when stripping u/ prefix", () => {
  const body = buildReminderBody(FULL_EVENT, "U/darelphilip", [], []);
  assert.match(body, /\*\*Organized by:\*\* u\/darelphilip/);
  assert.doesNotMatch(body, /u\/u\//);
});

test("buildReminderBody strips u/ prefix from each mod entry", () => {
  // Defensive: even if a caller accidentally passes u/-prefixed mods,
  // the body should never contain u/u/.
  const body = buildReminderBody(FULL_EVENT, "alice", ["u/modA", "modB", "u/modC"], []);
  const modLine = body.split("\n\n").find((s) => s.startsWith("**Moderators:**"));
  assert.ok(modLine, "Moderators line should exist");
  assert.equal(modLine, "**Moderators:** u/modA u/modB u/modC");
  assert.doesNotMatch(body, /u\/u\//);
});

test("buildReminderBody filters out empty mod entries after stripping", () => {
  // Edge case: a caller passes a list with only `u/` or whitespace entries.
  // After stripping, those should be filtered out, not rendered as `u/`.
  const body = buildReminderBody(FULL_EVENT, "alice", ["u/", "  ", "modA"], []);
  const modLine = body.split("\n\n").find((s) => s.startsWith("**Moderators:**"));
  assert.equal(modLine, "**Moderators:** u/modA");
});

test("buildReminderBody omits Organized by line when organizer is empty", () => {
  // Defensive: if both `event.organizer` and the fallback are empty,
  // skip the line entirely rather than render `u/` with nothing after.
  const body = buildReminderBody(FULL_EVENT, "", ["modA"], []);
  assert.doesNotMatch(body, /\*\*Organized by:\*\*/);
  // Mod line should still be present
  assert.match(body, /\*\*Moderators:\*\* u\/modA/);
});

// =====================================================================
// buildReminderTitle (e24 hotfix)
// =====================================================================

test("buildReminderTitle includes title, date, and @ location when all present", () => {
  const title = buildReminderTitle({
    title: "Bangalore Tech Chai",
    date: "2026-06-21",
    location: "Koramangala Social",
  });
  assert.equal(title, "🔔 Event Reminder: Bangalore Tech Chai — 2026-06-21 @ Koramangala Social");
});

test("buildReminderTitle omits the @ location suffix when location is empty", () => {
  const title = buildReminderTitle({
    title: "Bangalore Tech Chai",
    date: "2026-06-21",
    location: "",
  });
  assert.equal(title, "🔔 Event Reminder: Bangalore Tech Chai — 2026-06-21");
  assert.doesNotMatch(title, /@/);
});

test("buildReminderTitle omits the @ location suffix when location is whitespace", () => {
  const title = buildReminderTitle({
    title: "Bangalore Tech Chai",
    date: "2026-06-21",
    location: "   ",
  });
  assert.equal(title, "🔔 Event Reminder: Bangalore Tech Chai — 2026-06-21");
});

test("buildReminderTitle falls back to TBD for missing title and date", () => {
  const title = buildReminderTitle({
    title: "",
    date: "",
    location: "Some Place",
  });
  assert.equal(title, "🔔 Event Reminder: TBD — TBD @ Some Place");
});

test("buildReminderTitle accepts a custom prefix for the 2h window (e30)", () => {
  const title = buildReminderTitle(
    { title: "Coffee Meetup", date: "2026-06-25", location: "Central Park" },
    "⏰ Starting Soon:",
  );
  assert.equal(title, "⏰ Starting Soon: Coffee Meetup — 2026-06-25 @ Central Park");
});

// event-announcement-post: buildAnnouncementTitle format
test("buildAnnouncementTitle includes title, date, and @ location when all present", () => {
  const title = buildAnnouncementTitle({
    title: "Bangalore Tech Chai",
    date: "2026-06-21",
    location: "Cubbon Park",
  });
  assert.equal(title, "📅 [New Meetup] Bangalore Tech Chai — 2026-06-21 @ Cubbon Park");
});

test("buildAnnouncementTitle omits @ location when location is empty", () => {
  const title = buildAnnouncementTitle({
    title: "Coffee Meetup",
    date: "2026-06-25",
    location: "",
  });
  assert.equal(title, "📅 [New Meetup] Coffee Meetup — 2026-06-25");
});

test("buildAnnouncementTitle omits @ location when location is whitespace-only", () => {
  const title = buildAnnouncementTitle({
    title: "Coffee Meetup",
    date: "2026-06-25",
    location: "   ",
  });
  assert.equal(title, "📅 [New Meetup] Coffee Meetup — 2026-06-25");
});

test("buildAnnouncementTitle falls back to 'New Meetup' for missing title and TBD for missing date", () => {
  const title = buildAnnouncementTitle({
    title: "",
    date: "",
    location: "Some Place",
  });
  assert.equal(title, "📅 [New Meetup] New Meetup — TBD @ Some Place");
});

test("buildAnnouncementTitle is deterministic (same input -> same output)", () => {
  const input = { title: "Hike", date: "2026-07-01", location: "Sunrise Point" };
  assert.equal(buildAnnouncementTitle(input), buildAnnouncementTitle(input));
});

test("buildReminderTitle with custom prefix omits @ location when location is empty (e30)", () => {
  const title = buildReminderTitle(
    { title: "Coffee Meetup", date: "2026-06-25", location: "" },
    "⏰ Starting Soon:",
  );
  assert.equal(title, "⏰ Starting Soon: Coffee Meetup — 2026-06-25");
});

// =====================================================================
// buildReminderBody — maps link + Meetit app deep link (e26)
// =====================================================================

test("buildReminderBody includes a Google Maps section when event.mapUrl is set", () => {
  const body = buildReminderBody({ ...FULL_EVENT, mapUrl: "https://maps.google.com/?q=Cubbon+Park" }, "alice", [], []);
  assert.match(body, /## 🗺️ \[Google Maps \/ Virtual Event Link\]\(https:\/\/maps\.google\.com\/\?q=Cubbon\+Park\)/);
});

test("buildReminderBody omits the maps section when event.mapUrl is empty", () => {
  const body = buildReminderBody({ ...FULL_EVENT, mapUrl: "" }, "alice", [], []);
  assert.doesNotMatch(body, /## 🗺️/);
});

test("buildReminderBody omits the maps section when event.mapUrl is whitespace", () => {
  const body = buildReminderBody({ ...FULL_EVENT, mapUrl: "   " }, "alice", [], []);
  assert.doesNotMatch(body, /## 🗺️/);
});

test("buildReminderBody prefers meetitAppPostUrl over subreddit homepage for the deep link", () => {
  // When a launcher post ID is known, the body should deep-link straight to it,
  // not the subreddit homepage.
  const body = buildReminderBody(FULL_EVENT, "alice", [], [], "meetup_hub2_dev", "https://www.reddit.com/comments/1uab0cg/");
  assert.match(body, /🚀 \*\*\[Open in Meetit to RSVP\]\(https:\/\/www\.reddit\.com\/comments\/1uab0cg\/\)\*\*/);
  // The subreddit homepage URL should NOT appear in the deep-link context
  assert.doesNotMatch(body, /https:\/\/www\.reddit\.com\/r\/meetup_hub2_dev/);
});

test("buildReminderBody falls back to subreddit homepage when meetitAppPostUrl is missing", () => {
  // No launcher post known yet (fresh install, no mod has clicked "Create Meetit Post").
  // The body should fall back to the subreddit homepage with a hint for mods.
  const body = buildReminderBody(FULL_EVENT, "alice", [], [], "meetup_hub2_dev");
  assert.match(body, /🚀 \*\*\[Open in Meetit to RSVP\]\(https:\/\/www\.reddit\.com\/r\/meetup_hub2_dev\)\*\*/);
  assert.match(body, /create a "Meetit - Community Meetups" post via the subreddit menu/);
});

test("buildReminderBody falls back to subreddit homepage when meetitAppPostUrl is empty string", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], [], "meetup_hub2_dev", "");
  // Empty string is treated as missing — fallback kicks in
  assert.match(body, /🚀 \*\*\[Open in Meetit to RSVP\]\(https:\/\/www\.reddit\.com\/r\/meetup_hub2_dev\)\*\*/);
});

test("buildReminderBody omits the deep link entirely when both subreddit and app post are missing", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], []);
  assert.doesNotMatch(body, /🚀 \*\*\[Open in Meetit to RSVP\]/);
});

// =====================================================================
// buildRsvpShareBody — "I'm going to X" social share (e27)
// =====================================================================

const SHARE_EVENT = {
  title: "Bangalore Tech Chai",
  date: "2026-06-21",
  time: "18:30",
  location: "Koramangala Social",
  description: "Lightning talks and side projects. Bring your laptop!",
  mapUrl: "https://maps.google.com/?q=Cubbon+Park",
};

test("buildRsvpShareBody returns a title and body for a full event", () => {
  const { title, body } = buildRsvpShareBody(SHARE_EVENT, "darelphilip", [], "meetup_hub2_dev", []);
  // Title format: "u/username is going to Title (date)"
  assert.equal(title, "u/darelphilip is going to Bangalore Tech Chai (2026-06-21)");
  // Body should contain all four sections
  assert.match(body, /## 📅 2026-06-21 at 18:30/);
  assert.match(body, /## 📍 Koramangala Social/);
  assert.match(body, /## 🗺️ \[Google Maps \/ Virtual Event Link\]\(https:\/\/maps\.google\.com/);
  assert.match(body, /## 📝 Lightning talks and side projects\. Bring your laptop!/);
  // Footer with subreddit link
  assert.match(body, /Posted via \[Meetit\]\(https:\/\/www\.reddit\.com\/r\/meetup_hub2_dev\)/);
});

test("buildRsvpShareBody omits the maps section when event.mapUrl is empty", () => {
  const { body } = buildRsvpShareBody({ ...SHARE_EVENT, mapUrl: "" }, "alice", [], "meetup_hub2_dev", []);
  assert.doesNotMatch(body, /## 🗺️/);
  // Other sections still present
  assert.match(body, /## 📅/);
  assert.match(body, /## 📍/);
  assert.match(body, /## 📝/);
});

test("buildRsvpShareBody omits the description section when description is empty", () => {
  const { body } = buildRsvpShareBody({ ...SHARE_EVENT, description: "" }, "alice", [], "meetup_hub2_dev", []);
  assert.doesNotMatch(body, /## 📝/);
  // Other sections still present
  assert.match(body, /## 📅/);
  assert.match(body, /## 📍/);
  assert.match(body, /## 🗺️/);
});

test("buildRsvpShareBody truncates long descriptions to 300 chars with an ellipsis", () => {
  const longDesc = "a".repeat(500);
  const { body } = buildRsvpShareBody({ ...SHARE_EVENT, description: longDesc }, "alice", [], "meetup_hub2_dev", []);
  // Extract the description section
  const descSection = body.split("\n\n").find((s) => s.startsWith("## 📝"));
  assert.ok(descSection, "Description section should exist");
  // Total section length = "## 📝 " (6) + 300 chars + "…" (1) = 307
  // Extract just the description text (skip "## 📝 ")
  const descText = descSection.substring("## 📝 ".length);
  assert.equal(descText.length, 301, "Description should be 300 chars + ellipsis");
  assert.ok(descText.endsWith("…"), "Truncated description should end with ellipsis");
  // Should NOT contain the full 500 a's
  assert.ok(!descText.includes("a".repeat(400)), "Should not contain un-truncated content");
});

test("buildRsvpShareBody strips u/ prefix from username before rendering", () => {
  // Same defensive pattern as buildReminderBody: form prefill adds u/, so
  // legacy data may store u/darelphilip. We must never render u/u/darelphilip.
  const { title } = buildRsvpShareBody(SHARE_EVENT, "u/darelphilip", [], "meetup_hub2_dev");
  assert.equal(title, "u/darelphilip is going to Bangalore Tech Chai (2026-06-21)");
  assert.doesNotMatch(title, /u\/u\//);
});

test("buildRsvpShareBody falls back to plain footer when subredditName is missing", () => {
  const { body } = buildRsvpShareBody(SHARE_EVENT, "alice", []);
  // No subreddit → footer is just "Posted via Meetit." with no link
  assert.match(body, /Posted via Meetit\./);
  assert.doesNotMatch(body, /\[Meetit\]\(https:\/\/www\.reddit\.com\/r\//);
});

// =====================================================================
// e28: formatAttendeeList helper
// =====================================================================

test("formatAttendeeList returns empty string for empty/null input", () => {
  assert.equal(formatAttendeeList([]), "");
  assert.equal(formatAttendeeList(undefined as any), "");
});

test("formatAttendeeList dedupes case-insensitively and strips u/ prefix", () => {
  const result = formatAttendeeList(["alice", "u/bob", "Alice", "BOB", "charlie"]);
  assert.equal(result, "u/alice u/bob u/charlie");
});

test("formatAttendeeList sorts alphabetically (case-insensitive)", () => {
  const result = formatAttendeeList(["charlie", "alice", "bob"]);
  assert.equal(result, "u/alice u/bob u/charlie");
});

test("formatAttendeeList caps at 20 and appends +N more", () => {
  // Build a list of 25 users
  const attendees = Array.from({ length: 25 }, (_, i) => "user" + String(i).padStart(2, "0"));
  const result = formatAttendeeList(attendees);
  // Should contain first 20 sorted + " +5 more"
  assert.match(result, /\+5 more$/);
  // Count the u/ tokens (each is one attendee)
  const uCount = (result.match(/u\//g) || []).length;
  assert.equal(uCount, 20, "Should have exactly 20 u/ mentions");
});

test("formatAttendeeList returns no +N more when count equals cap", () => {
  // Build a list of exactly 20 users
  const attendees = Array.from({ length: 20 }, (_, i) => "user" + String(i).padStart(2, "0"));
  const result = formatAttendeeList(attendees);
  assert.doesNotMatch(result, /more/);
  assert.equal((result.match(/u\//g) || []).length, 20);
});

// =====================================================================
// e28: buildRsvpShareBody with otherAttendees
// =====================================================================

test("buildRsvpShareBody omits the Also going section when otherAttendees is empty", () => {
  const { body } = buildRsvpShareBody(SHARE_EVENT, "alice", [], "meetup_hub2_dev");
  assert.doesNotMatch(body, /Also going/);
});

test("buildRsvpShareBody includes the Also going section with count when otherAttendees is non-empty", () => {
  const { body } = buildRsvpShareBody(SHARE_EVENT, "alice", ["bob", "charlie"], "meetup_hub2_dev");
  assert.match(body, /## 👥 Also going \(2\): u\/bob u\/charlie/);
});

test("buildRsvpShareBody caps the Also going list at 20 with +N more", () => {
  const others = Array.from({ length: 25 }, (_, i) => "user" + String(i).padStart(2, "0"));
  const { body } = buildRsvpShareBody(SHARE_EVENT, "alice", others, "meetup_hub2_dev");
  assert.match(body, /## 👥 Also going \(25\)/);
  assert.match(body, /\+5 more/);
});

// =====================================================================
// e28: buildReminderBody with attendees
// =====================================================================

test("buildReminderBody omits the going line when attendees is empty", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], [], "meetup_hub2_dev");
  assert.doesNotMatch(body, /\d+ going/);
});

test("buildReminderBody includes the going line with attendee list when attendees non-empty", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], ["bob", "charlie"], "meetup_hub2_dev");
  assert.match(body, /## 👥 2 going: u\/bob u\/charlie/);
});

test("buildReminderBody caps the going list at 20 with +N more", () => {
  const attendees = Array.from({ length: 30 }, (_, i) => "user" + String(i).padStart(2, "0"));
  const body = buildReminderBody(FULL_EVENT, "alice", [], attendees, "meetup_hub2_dev");
  assert.match(body, /## 👥 30 going:/);
  assert.match(body, /\+10 more/);
});

// =====================================================================
// e31: buildGoogleCalendarUrl — server-side helper for post body calendar link
// =====================================================================

test("buildGoogleCalendarUrl returns a valid Google Calendar URL with full data", () => {
  const url = buildGoogleCalendarUrl(
    { title: "Coffee Meetup", date: "2026-06-25", time: "22:50", location: "Central Park", description: "Casual chat", mapUrl: "https://maps.google.com/?q=CP" },
    "+05:30",
  );
  assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  // URLSearchParams uses `+` for spaces in the encoded URL
  assert.match(url, /text=Coffee(\+|%20)Meetup/);
  // 22:50 IST (+05:30) = 17:20 UTC; end = 18:20 UTC
  // The `/` in dates is left as-is (Google Calendar accepts both `/` and `%2F`)
  assert.match(url, /dates=20260625T172000Z\/20260625T182000Z/);
  assert.match(url, /location=Central%20Park/);
  assert.match(url, /details=/);
});

test("buildGoogleCalendarUrl returns empty string when date is missing", () => {
  const url = buildGoogleCalendarUrl({ title: "X", date: "", time: "10:00" }, "+05:30");
  assert.equal(url, "");
});

test("buildGoogleCalendarUrl returns empty string when date is malformed", () => {
  const url = buildGoogleCalendarUrl({ title: "X", date: "not-a-date", time: "10:00" }, "+05:30");
  assert.equal(url, "");
});

test("buildGoogleCalendarUrl defaults time to 00:00 when empty", () => {
  const url = buildGoogleCalendarUrl({ title: "All-day", date: "2026-06-25", time: "" }, "+05:30");
  // 00:00 IST on 2026-06-25 = 18:30 UTC on 2026-06-24. End = 01:00 IST = 19:30 UTC on 2026-06-24.
  assert.match(url, /dates=20260624T183000Z\/20260624T193000Z/);
});

test("buildGoogleCalendarUrl defaults timezone to +05:30 when empty", () => {
  const url = buildGoogleCalendarUrl({ title: "X", date: "2026-06-25", time: "10:00", location: "" }, "");
  // 10:00 IST (+05:30) = 04:30 UTC
  assert.match(url, /dates=20260625T043000Z\/20260625T053000Z/);
});

test("buildGoogleCalendarUrl omits mapUrl in details when not provided", () => {
  const url = buildGoogleCalendarUrl({ title: "X", date: "2026-06-25", time: "10:00" }, "+05:30");
  // The details param should not contain the map emoji
  const detailsMatch = url.match(/details=([^&]*)/);
  assert.ok(detailsMatch);
  assert.ok(!detailsMatch[1].includes("%F0%9F%97%BA")); // 🗺️ not URL-encoded
});

test("buildGoogleCalendarUrl appends mapUrl to details when present", () => {
  const url = buildGoogleCalendarUrl(
    { title: "X", date: "2026-06-25", time: "10:00", mapUrl: "https://maps.google.com/?q=CP" },
    "+05:30",
  );
  // The 🗺️ is URL-encoded in the URL
  assert.match(url, /%F0%9F%97%BA/);
  assert.match(url, /https%3A%2F%2Fmaps\.google\.com/);
});

test("buildReminderBody includes a Google Calendar link after the Maps link (e31)", () => {
  const body = buildReminderBody(FULL_EVENT, "alice", [], []);
  // Find the calendar section
  assert.match(body, /## 📅 \[Add to Google Calendar\]\(https:\/\/calendar\.google\.com/);
  // It should appear AFTER the maps section (if any) or after the time/location blocks
  const mapIdx = body.indexOf("## 🗺️");
  const calIdx = body.indexOf("## 📅 [Add to Google Calendar]");
  if (mapIdx >= 0) assert.ok(calIdx > mapIdx, "calendar link should come after maps link");
});

test("buildReminderBody omits calendar link when event.date is missing", () => {
  const event = { ...FULL_EVENT, date: "" };
  const body = buildReminderBody(event, "alice", [], []);
  assert.doesNotMatch(body, /Add to Google Calendar/);
});

test("buildRsvpShareBody includes a Google Calendar link after Maps (e31)", () => {
  const { body } = buildRsvpShareBody(SHARE_EVENT, "alice", [], "meetup_hub2_dev");
  assert.match(body, /## 📅 \[Add to Google Calendar\]\(https:\/\/calendar\.google\.com/);
});

test("buildRsvpShareBody omits calendar link when event.date is missing", () => {
  const { body } = buildRsvpShareBody({ ...SHARE_EVENT, date: "" }, "alice", [], "meetup_hub2_dev");
  assert.doesNotMatch(body, /Add to Google Calendar/);
});

// ===== pitch-feedback-loop =====

test("parseQueryParam returns the value of a single param", () => {
  assert.equal(parseQueryParam("/api/pitched-ideas?status=pending", "status"), "pending");
});

test("parseQueryParam decodes URL-encoded values", () => {
  assert.equal(parseQueryParam("/api/foo?reason=Spam%20duplicate", "reason"), "Spam duplicate");
});

test("parseQueryParam returns undefined when param is absent", () => {
  assert.equal(parseQueryParam("/api/pitched-ideas", "status"), undefined);
  assert.equal(parseQueryParam("/api/pitched-ideas?other=x", "status"), undefined);
});

test("parseQueryParam returns empty string for ?status= (explicit empty)", () => {
  assert.equal(parseQueryParam("/api/foo?status=", "status"), "");
});

test("parseQueryParam handles multiple params", () => {
  assert.equal(parseQueryParam("/api/foo?a=1&status=dismissed&b=2", "status"), "dismissed");
});

test("parseQueryParam returns undefined for undefined URL", () => {
  assert.equal(parseQueryParam(undefined, "status"), undefined);
});

test("stripQueryString returns just the path", () => {
  assert.equal(stripQueryString("/api/pitched-ideas?status=pending"), "/api/pitched-ideas");
  assert.equal(stripQueryString("/api/pitched-ideas"), "/api/pitched-ideas");
  assert.equal(stripQueryString(undefined), "/");
  assert.equal(stripQueryString("/?x=1"), "/");
});

test("pitchEffectiveStatus returns 'dismissed' for soft-dismissed pitches", () => {
  const idea = { id: "x", status: "dismissed", dismissReason: "spam" };
  assert.equal(pitchEffectiveStatus(idea), "dismissed");
});

test("pitchEffectiveStatus returns 'pending' for legacy pitches with no status field", () => {
  const idea = { id: "x", title: "old pitch" };
  assert.equal(pitchEffectiveStatus(idea), "pending");
});

test("pitchEffectiveStatus returns 'pending' for null/undefined/empty input", () => {
  assert.equal(pitchEffectiveStatus(null), "pending");
  assert.equal(pitchEffectiveStatus(undefined), "pending");
  assert.equal(pitchEffectiveStatus({}), "pending");
});

test("pitchEffectiveStatus ignores unknown status values (treats them as pending)", () => {
  // Defensive: any value other than the literal string "dismissed" falls back
  // to "pending". This is intentional — we don't trust the stored status
  // field to invent new states.
  assert.equal(pitchEffectiveStatus({ status: "converted" }), "pending");
  assert.equal(pitchEffectiveStatus({ status: "" }), "pending");
});

test("validateDismissReason rejects missing/empty/non-string", () => {
  assert.equal(validateDismissReason(undefined), "Reason required");
  assert.equal(validateDismissReason(""), "Reason required");
  assert.equal(validateDismissReason("   "), "Reason required");
  assert.equal(validateDismissReason(null), "Reason required");
  assert.equal(validateDismissReason(42), "Reason required");
});

test("validateDismissReason accepts a valid reason", () => {
  assert.equal(validateDismissReason("Spam"), null);
  assert.equal(validateDismissReason("  Trim me  "), null); // trims whitespace
});

test("validateDismissReason rejects reasons over 100 chars", () => {
  const long = "x".repeat(101);
  assert.equal(validateDismissReason(long), "Reason must be 100 characters or less");
  const exactly = "y".repeat(100);
  assert.equal(validateDismissReason(exactly), null); // exactly 100 is fine
});

test("validateDismissReason treats 100-char limit as character count after trim", () => {
  // 100 chars of "x" plus 10 spaces (trimmed to 100) is valid
  const padded = "   " + "x".repeat(100) + "   ";
  assert.equal(validateDismissReason(padded), null);
});

// debug-panel-install-gate: the 🐛 button is only shown when BOTH the user
// is a mod AND the install setting is on. The visibility decision is a
// pure function so the matrix can be unit tested.
test("decideDebugPanelVisibility: mod + setting on → show", () => {
  assert.equal(decideDebugPanelVisibility(true, true), "show");
});

test("decideDebugPanelVisibility: mod + setting off → hide", () => {
  // Mod is loaded but the install hasn't opted in. Default behavior.
  assert.equal(decideDebugPanelVisibility(true, false), "hide");
});

test("decideDebugPanelVisibility: non-mod + setting on → hide", () => {
  // Setting is on but user is not a mod. Defense in depth: even if a
  // non-mod found the install setting flipped on, they still can't see
  // the panel.
  assert.equal(decideDebugPanelVisibility(false, true), "hide");
});

test("decideDebugPanelVisibility: non-mod + setting off → hide", () => {
  assert.equal(decideDebugPanelVisibility(false, false), "hide");
});

test("decideDebugPanelVisibility: only shows when both flags are strictly true", () => {
  // Truthy-but-not-true values (1, "true", etc.) should NOT bypass the
  // check — the install setting is read as a strict boolean.
  assert.equal(decideDebugPanelVisibility(1 as any, true), "hide");
  assert.equal(decideDebugPanelVisibility(true, 1 as any), "hide");
  assert.equal(decideDebugPanelVisibility("true" as any, true), "hide");
});

// pitch-approve: extended pitchEffectiveStatus to return "approved" too.
test("pitchEffectiveStatus returns 'approved' for status === 'approved'", () => {
  assert.equal(pitchEffectiveStatus({ status: "approved" }), "approved");
  assert.equal(pitchEffectiveStatus({ status: "approved", approvedAt: "2026-06-26T10:00:00.000Z" }), "approved");
});

test("pitchEffectiveStatus still returns 'dismissed' for status === 'dismissed'", () => {
  // Back-compat: the pitch-feedback-loop behavior is preserved.
  assert.equal(pitchEffectiveStatus({ status: "dismissed", dismissReason: "spam" }), "dismissed");
});

test("pitchEffectiveStatus is case-sensitive (rejects 'Approved' / 'APPROVED')", () => {
  // Defensive against schema drift: only the literal lowercase "approved"
  // counts. Mixed-case or all-caps falls back to "pending".
  assert.equal(pitchEffectiveStatus({ status: "Approved" }), "pending");
  assert.equal(pitchEffectiveStatus({ status: "APPROVED" }), "pending");
  assert.equal(pitchEffectiveStatus({ status: "Dismissed" }), "pending");
});

test("pitchEffectiveStatus returns 'pending' for null/undefined/empty status", () => {
  assert.equal(pitchEffectiveStatus(null), "pending");
  assert.equal(pitchEffectiveStatus(undefined), "pending");
  assert.equal(pitchEffectiveStatus({}), "pending");
  assert.equal(pitchEffectiveStatus({ status: "" }), "pending");
  assert.equal(pitchEffectiveStatus({ status: "pending" }), "pending");
});

// pitch-approve: buildApproveDm template helper. Pure, deterministic, testable.
test("buildApproveDm produces expected subject + body for u/-prefixed username", () => {
  const dm = buildApproveDm({ title: "Board game night", submittedBy: "u/alice" });
  assert.equal(dm.subject, "✅ Your Meetit pitch was approved!");
  assert.match(dm.body, /Hi u\/alice,/);
  assert.match(dm.body, /"Board game night"/);
  assert.match(dm.body, /\[\+\] menu/);
  assert.match(dm.body, /— Meetit Mods/);
});

test("buildApproveDm normalizes bare username (no u/ prefix)", () => {
  // Defensive: form data may store usernames with or without the u/ prefix
  // (LEARNINGS §49). The DM should always render with exactly one u/.
  const dm = buildApproveDm({ title: "Hike at sunrise", submittedBy: "bob" });
  assert.match(dm.body, /Hi u\/bob,/);
  assert.doesNotMatch(dm.body, /u\/u\//);
});

test("buildApproveDm is deterministic (same input → same output)", () => {
  const input = { title: "Chess tournament", submittedBy: "u/carol" };
  const dm1 = buildApproveDm(input);
  const dm2 = buildApproveDm(input);
  assert.equal(dm1.subject, dm2.subject);
  assert.equal(dm1.body, dm2.body);
});

test("buildApproveDm handles empty/null title and submittedBy gracefully", () => {
  // Defensive: malformed input shouldn't crash. The title falls back to
  // "your idea" and the username falls back to "anonymous".
  const dm = buildApproveDm({ title: "", submittedBy: "" });
  assert.match(dm.body, /Hi u\/anonymous,/);
  assert.match(dm.body, /"your idea"/);
  const dm2 = buildApproveDm({ title: null as any, submittedBy: null as any });
  assert.match(dm2.body, /Hi u\/anonymous,/);
});

// aged-cleanup-mode: isEventAgedOut boundary + defensive skips.
test("isEventAgedOut: event 30 days in the past is NOT aged (boundary)", () => {
  // Now is 2026-06-26 10:00 IST. Event is 30 days before that, at 10:00 IST.
  // The boundary is strict: (now - instant) > 30d, so 30d exactly is NOT aged.
  const now = new Date("2026-06-26T10:00:00.000+05:30");
  const event = { date: "2026-05-27", time: "10:00" };
  assert.equal(isEventAgedOut(event, now, 30, "+05:30"), false);
});

test("isEventAgedOut: event 30 days + 1 second in the past IS aged", () => {
  const now = new Date("2026-06-26T10:00:01.000+05:30");
  const event = { date: "2026-05-27", time: "10:00" };
  assert.equal(isEventAgedOut(event, now, 30, "+05:30"), true);
});

test("isEventAgedOut: future event is never aged", () => {
  const now = new Date("2026-06-26T10:00:00.000+05:30");
  const event = { date: "2027-01-01", time: "10:00" };
  assert.equal(isEventAgedOut(event, now, 30, "+05:30"), false);
});

test("isEventAgedOut: missing date returns false (defensive skip)", () => {
  const now = new Date();
  assert.equal(isEventAgedOut({ time: "10:00" }, now, 30, "+05:30"), false);
  assert.equal(isEventAgedOut({ date: "2026-01-01" }, now, 30, "+05:30"), false);
  assert.equal(isEventAgedOut({}, now, 30, "+05:30"), false);
  assert.equal(isEventAgedOut(null, now, 30, "+05:30"), false);
});

test("isEventAgedOut: invalid date/time returns false", () => {
  const now = new Date();
  assert.equal(isEventAgedOut({ date: "not-a-date", time: "10:00" }, now, 30, "+05:30"), false);
  assert.equal(isEventAgedOut({ date: "2026-13-99", time: "25:99" }, now, 30, "+05:30"), false);
});

// aged-cleanup-mode: isPitchAgedOut boundary + defensive skips.
test("isPitchAgedOut: pitch 30 days old is NOT aged (boundary)", () => {
  const now = new Date("2026-06-26T10:00:00.000Z");
  const pitch = { submittedAt: "2026-05-27T10:00:00.000Z" };
  assert.equal(isPitchAgedOut(pitch, now, 30), false);
});

test("isPitchAgedOut: pitch 30 days + 1 second old IS aged", () => {
  const now = new Date("2026-06-26T10:00:01.000Z");
  const pitch = { submittedAt: "2026-05-27T10:00:00.000Z" };
  assert.equal(isPitchAgedOut(pitch, now, 30), true);
});

test("isPitchAgedOut: missing submittedAt returns false (defensive skip)", () => {
  const now = new Date();
  assert.equal(isPitchAgedOut({}, now, 30), false);
  assert.equal(isPitchAgedOut({ submittedAt: "" }, now, 30), false);
  assert.equal(isPitchAgedOut({ submittedAt: "not-a-date" }, now, 30), false);
  assert.equal(isPitchAgedOut(null, now, 30), false);
});

test("isPitchAgedOut: status does not affect aging (approved/dismissed/pending all eligible)", () => {
  const now = new Date("2026-06-26T10:00:00.000Z");
  const oldSubmittedAt = "2025-01-01T00:00:00.000Z";
  assert.equal(isPitchAgedOut({ status: "pending", submittedAt: oldSubmittedAt }, now, 30), true);
  assert.equal(isPitchAgedOut({ status: "dismissed", submittedAt: oldSubmittedAt }, now, 30), true);
  assert.equal(isPitchAgedOut({ status: "approved", submittedAt: oldSubmittedAt }, now, 30), true);
});

// aged-cleanup-mode: pickAgedItems splits correctly.
test("pickAgedItems splits aged events into active vs pending", () => {
  const now = new Date("2026-06-26T10:00:00.000+05:30");
  const oldActiveEvent = { id: "evt_old_active", date: "2025-01-01", time: "10:00" };
  const oldPendingEvent = { id: "evt_old_pending", date: "2025-01-01", time: "10:00" };
  const newActiveEvent = { id: "evt_new_active", date: "2026-12-31", time: "10:00" };
  const oldPitch = { id: "pitch_old", submittedAt: "2025-01-01T00:00:00.000Z" };
  const newPitch = { id: "pitch_new", submittedAt: "2026-06-20T00:00:00.000Z" };
  const result = pickAgedItems(
    [oldActiveEvent, newActiveEvent],
    [oldPendingEvent],
    [oldPitch, newPitch],
    now,
    30,
    "+05:30",
  );
  assert.equal(result.agedActiveEvents.length, 1);
  assert.equal(result.agedActiveEvents[0].id, "evt_old_active");
  assert.equal(result.agedPendingEvents.length, 1);
  assert.equal(result.agedPendingEvents[0].id, "evt_old_pending");
  assert.equal(result.agedPitches.length, 1);
  assert.equal(result.agedPitches[0].id, "pitch_old");
});

// aged-cleanup-mode: buildCleanupLogEntry is deterministic and includes all fields.
test("buildCleanupLogEntry includes ts, events, pitches, thresholdDays, trigger, user", () => {
  const now = new Date("2026-06-26T10:00:00.000Z");
  const entry = buildCleanupLogEntry(
    now,
    { eventsActive: 3, eventsPending: 1, pitches: 2 },
    { thresholdDays: 30, trigger: "manual", user: "u/darelphilip" },
  );
  const parsed = JSON.parse(entry);
  assert.equal(parsed.ts, "2026-06-26T10:00:00.000Z");
  assert.deepEqual(parsed.events, { active: 3, pending: 1 });
  assert.equal(parsed.pitches, 2);
  assert.equal(parsed.thresholdDays, 30);
  assert.equal(parsed.trigger, "manual");
  assert.equal(parsed.user, "u/darelphilip");
});

test("buildCleanupLogEntry is deterministic (same inputs → same output)", () => {
  const now = new Date("2026-06-26T10:00:00.000Z");
  const counts = { eventsActive: 0, eventsPending: 0, pitches: 5 };
  const meta = { thresholdDays: 30, trigger: "cron" as const, user: "system" };
  assert.equal(buildCleanupLogEntry(now, counts, meta), buildCleanupLogEntry(now, counts, meta));
});
