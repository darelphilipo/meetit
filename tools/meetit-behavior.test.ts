import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttendees,
  buildReminderBody,
  buildReminderTitle,
  buildRsvpShareBody,
  createPendingEvent,
  csvEscape,
  formatAttendeeList,
  isConfiguredModerator,
  isSubmissionOwner,
  normalizeUsername,
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

// =====================================================================
// buildReminderBody — maps link + Meetit app deep link (e26)
// =====================================================================

test("buildReminderBody includes a Google Maps section when event.mapUrl is set", () => {
  const body = buildReminderBody({ ...FULL_EVENT, mapUrl: "https://maps.google.com/?q=Cubbon+Park" }, "alice", [], []);
  assert.match(body, /## 🗺️ \[Open in Google Maps\]\(https:\/\/maps\.google\.com\/\?q=Cubbon\+Park\)/);
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
  assert.match(body, /## 🗺️ \[Open in Google Maps\]\(https:\/\/maps\.google\.com/);
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
