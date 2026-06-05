import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttendees,
  createPendingEvent,
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
