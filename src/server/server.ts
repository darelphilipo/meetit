import type { IncomingMessage, ServerResponse } from "node:http";
import { context, reddit, redis, settings } from "@devvit/web/server";
import type { PartialJsonValue, UiResponse } from "@devvit/web/shared";
import type { TaskResponse } from "@devvit/scheduler";
import {
  ApiEndpoint,
  type MeetitEvent,
  type HomeState,
  type EventDetails,
  type AppSettings,
  type RsvpFormData,
  type PitchFormData,
  type RsvpAttendee,
  type SubmitEventFormData,
} from "../shared/api.ts";
import { buildAttendees, buildReminderBody, buildReminderTitle, buildRsvpShareBody, createPendingEvent, csvEscape, isConfiguredModerator, isSubmissionOwner, normalizeUsername } from "../shared/meetit.ts";
import { once } from "node:events";

const MAX_SERVER_LOGS = 100;

// Capture all server logs into Redis for UI retrieval
function serverLog(level: "info" | "warn" | "error", message: string) {
  const entry = JSON.stringify({ ts: Date.now(), level, msg: message });
  // Fire-and-forget: don't await, don't block the request
  redis.zAdd("meetit:server_logs", { score: Date.now(), member: entry }).catch((e: any) => {
    console.log(`[SERVER-LOG-FAIL] zAdd error: ${e}`);
  });
  // Also trim old entries asynchronously
  redis.zRemRangeByRank("meetit:server_logs", 0, -MAX_SERVER_LOGS - 1).catch((e: any) => {
    console.log(`[SERVER-LOG-FAIL] trim error: ${e}`);
  });
}

function safeJSONParse(val: string): any | null {
  try { return JSON.parse(val); } catch { return null; }
}

export async function serverOnRequest(
  req: IncomingMessage,
  rsp: ServerResponse,
): Promise<void> {
  try {
    await onRequest(req, rsp);
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`;
    console.error(msg);
    serverLog("error", msg.substring(0, 500));
    const status = (err as any)?.statusCode || 500;
    const errorMsg = status === 400 ? "Invalid request body" : "Internal server error";
    writeJSON<ErrorResponse>(status, { error: errorMsg, status }, rsp);
  }
}

async function onRequest(
  req: IncomingMessage,
  rsp: ServerResponse,
): Promise<void> {
  const url = req.url;

  if (!url || url === "/") {
    writeJSON<ErrorResponse>(404, { error: "not found", status: 404 }, rsp);
    return;
  }

  const endpoint = url as ApiEndpoint | InternalEndpoint;
  const apiMsg = `[API] ${req.method || "POST"} ${endpoint}`;
  console.log(apiMsg);
  serverLog("info", apiMsg);

  let body: ApiResponse | UiResponse | ErrorResponse | TaskResponse;
  switch (endpoint) {
    case ApiEndpoint.Init:
      body = await onInit();
      break;
    case ApiEndpoint.Home:
      body = await onHome();
      break;
    case ApiEndpoint.EventDetails:
      body = await onEventDetails(req);
      break;
    case ApiEndpoint.Rsvp:
      body = await onRsvp(req);
      break;
    case ApiEndpoint.RsvpShare:
      body = await onRsvpShare(req);
      break;
    case ApiEndpoint.LeaveEvent:
      body = await onLeaveEvent(req);
      break;
    case ApiEndpoint.RsvpList:
      body = await onRsvpList(req);
      break;
    case ApiEndpoint.MySubmissions:
      body = await onMySubmissions();
      break;
    case ApiEndpoint.PitchIdea:
      body = await onPitchIdea(req);
      break;
    case ApiEndpoint.SubmitEvent:
      body = await onSubmitEvent(req);
      break;
    case ApiEndpoint.ApproveEvent:
      body = await onApproveEvent(req);
      break;
    case ApiEndpoint.PendingEvents:
      body = await onPendingEvents();
      break;
    case ApiEndpoint.PitchedIdeas:
      body = await onPitchedIdeas();
      break;
    case ApiEndpoint.AllApprovedEvents:
      body = await onAllApprovedEvents();
      break;
    case ApiEndpoint.DismissIdea:
      body = await onDismissIdea(req);
      break;
    case ApiEndpoint.DeletePending:
      body = await onDeletePending(req);
      break;
    case ApiEndpoint.DeletePublished:
      body = await onDeletePublished(req);
      break;
    case ApiEndpoint.MyRsvp:
      body = await onMyRsvp(req);
      break;
    case ApiEndpoint.ExportAttendees:
      body = await onExportAttendees(req);
      break;
    case ApiEndpoint.ServerLogs:
      body = await onServerLogs();
      break;
    case InternalEndpoint.OnPostCreate:
      body = await onMenuCreatePost();
      break;
    case InternalEndpoint.OnAppInstall:
      body = await onAppInstall();
      break;
    case InternalEndpoint.OnAppUpgrade:
      body = await onAppUpgrade();
      break;
    case InternalEndpoint.CheckEvents:
      body = await onCheckEvents(req);
      break;
    default:
      endpoint satisfies never;
      body = { error: "not found", status: 404 };
      break;
  }

  writeJSON<PartialJsonValue>(typeof (body as any).status === "number" ? (body as any).status : 200, body, rsp);
}

const InternalEndpoint = {
  OnPostCreate: "/internal/menu/create-post",
  OnAppInstall: "/internal/on-app-install",
  OnAppUpgrade: "/internal/on-app-upgrade",
  CheckEvents: "/internal/scheduler/check-events",
} as const;

type InternalEndpoint = (typeof InternalEndpoint)[keyof typeof InternalEndpoint];

type ApiResponse =
  | { type: "init"; postId: string; username: string; settings: AppSettings; timezone: string }
  | { type: "home"; data: HomeState }
  | { type: "event-details"; data: EventDetails }
  | { type: "rsvp"; success: boolean; wasExisting?: boolean }
  | { type: "rsvp-share"; success: boolean; postUrl?: string; postedAs?: "USER" | "APP"; reason?: "already_shared" }
  | { type: "leave-event"; success: boolean }
  | { type: "rsvp-list"; attendees: RsvpAttendee[] }
  | { type: "pitch-idea"; success: boolean }
  | { type: "submit-event"; success: boolean }
  | { type: "approve-event"; success: boolean }
  | { type: "pending-events"; events: MeetitEvent[] }
  | { type: "pitched-ideas"; ideas: any[] }
  | { type: "all-approved-events"; events: any[] }
  | { type: "dismiss-idea"; success: boolean }
  | { type: "delete-pending"; success: boolean }
  | { type: "delete-published"; success: boolean }
  | { type: "my-submissions"; pitches: any[]; events: MeetitEvent[]; rsvps: any[] }
  | { type: "my-rsvp"; email: string; phone: string }
  | { type: "export-attendees"; csv: string; filename: string }
  | { type: "server-logs"; logs: { ts: number; level: string; msg: string }[] }
  | ErrorResponse;

type ErrorResponse = {
  error: string;
  status: number;
};

function normalizeTimezone(raw: unknown): string {
  if (Array.isArray(raw)) return (raw[0] as string) || "+05:30";
  return (raw as string) || "+05:30";
}

/**
 * Parse the `mod_usernames` setting into a list of trimmed, non-empty usernames.
 * The setting is typed as `string | number | true | string[]` per the Devvit
 * settings schema, so we coerce defensively. Returns [] if the value is empty,
 * missing, or not a parseable string.
 */
function parseModList(raw: unknown): string[] {
  if (raw == null) return [];
  let s: string;
  if (Array.isArray(raw)) {
    s = raw.map((v) => String(v)).join(",");
  } else if (typeof raw === "string") {
    s = raw;
  } else {
    return []; // number, boolean, or other — no usable usernames
  }
  return s
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

async function getSettings(): Promise<AppSettings> {
  try {
    const [primary, secondary, borders, tz] = await Promise.all([
      settings.get("primary_color"),
      settings.get("secondary_color"),
      settings.get("use_brutalist_borders"),
      settings.get("timezone"),
    ]);
    return {
      primary_color: (primary as string) || "#ffff00",
      secondary_color: (secondary as string) || "#ff69b4",
      use_brutalist_borders: (borders as boolean) !== false,
      timezone: normalizeTimezone(tz),
    };
  } catch (e) {
    console.error(`getSettings error: ${e}`);
    return { primary_color: "#ffff00", secondary_color: "#ff69b4", use_brutalist_borders: true, timezone: "+05:30" };
  }
}

async function isMod(): Promise<boolean> {
  const username = context.username;
  if (!username) return false;
  try {
    const modList = await settings.get("mod_usernames");
    if (modList) return isConfiguredModerator(username, modList);
} catch (e) { console.error(`isMod error: ${e}`); }
  return false;
}

async function requireMod(): Promise<ErrorResponse | undefined> {
  if (await isMod()) return undefined;
  return { error: "forbidden", status: 403 };
}

async function getActiveEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map((val) => safeJSONParse(val)).filter((e): e is MeetitEvent => e !== null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventList
    .filter((e) => new Date(e.date + "T00:00:00").getTime() >= today.getTime())
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

async function getAllApprovedEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map((val) => safeJSONParse(val)).filter((e): e is MeetitEvent => e !== null);
  return eventList.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

async function getActiveEvent(eventId: string): Promise<MeetitEvent | undefined> {
  const eventJson = await redis.hGet("meetit:active_events", eventId);
  return eventJson ? safeJSONParse(eventJson) : undefined;
}

async function getPendingEventsList(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:pending_events");
  return Object.values(events).map((val) => safeJSONParse(val)).filter((e): e is MeetitEvent => e !== null);
}

async function getRsvpCount(eventId: string): Promise<number> {
  return await redis.zCard(`meetit:rsvps:${eventId}`);
}
async function isUserRsvped(eventId: string, username: string): Promise<boolean> {
  const score = await getUserRsvpScore(eventId, username);
  return score != null;
}

async function addRsvp(eventId: string, username: string, email: string, phone: string): Promise<void> {
  const userKey = normalizeUsername(username);
  const key = `meetit:rsvps:${eventId}`;
  await redis.zAdd(key, { score: Date.now(), member: userKey });
  if (email || phone) {
    await redis.hSet(`meetit:rsvp_details:${eventId}`, { [userKey]: JSON.stringify({ email: email || "", phone: phone || "" }) });
  }
  const verifyScore = await redis.zScore(key, userKey);
  console.log(`[RSVP] ${username} → ${eventId} | score=${verifyScore} | email=${!!email} phone=${!!phone}`);
}

async function getUserRsvpScore(eventId: string, username: string): Promise<number | undefined> {
  const userKey = normalizeUsername(username);
  if (!userKey) return undefined;
  const key = `meetit:rsvps:${eventId}`;
  const score = await redis.zScore(key, userKey);
  if (score != null) return score;
  const results = await redis.zRange(key, "-inf", "+inf", { by: "score" });
  return results.find((entry) => normalizeUsername(entry.member) === userKey)?.score;
}

async function onInit(): Promise<ApiResponse> {
  const appSettings = await getSettings();
  // H1 fix: include isMod so the client can hide mod-only UI (debug panel)
  // BEFORE the home page loads. Without this, the client only knows isMod
  // after /api/home returns, leaving a brief window where the debug panel
  // might be visible to non-mods at app boot.
  const modStatus = await isMod();
  const initMsg = `[INIT] username=${context.username || "user"} isMod=${modStatus}`;
  console.log(initMsg);
  serverLog("info", initMsg);
  return {
    type: "init",
    postId: context.postId || "",
    username: context.username || "user",
    isMod: modStatus,
    settings: appSettings,
    timezone: appSettings.timezone,
  };
}

async function onHome(): Promise<ApiResponse> {
  const homeMsg1 = `[HOME] Loading events for user ${context.username}`;
  console.log(homeMsg1); serverLog("info", homeMsg1);
  const events = await getActiveEvents();
  const modStatus = await isMod();
  const homeMsg2 = `[HOME] Found ${events.length} events, isMod=${modStatus}`;
  console.log(homeMsg2); serverLog("info", homeMsg2);
  const appSettings = await getSettings();

  const username = context.username || "";
  // PERF1: batch RSVP queries instead of N+1 zRange per event
  const userKey = normalizeUsername(username);
  const [counts, rsvped] = await Promise.all([
    Promise.all(events.map((event) => redis.zCard(`meetit:rsvps:${event.id}`))),
    Promise.all(events.map((event) => redis.zScore(`meetit:rsvps:${event.id}`, userKey).then((s) => s != null))),
  ]);
  const eventsWithCounts = events.map((event, i) => ({
    ...event,
    rsvpCount: counts[i] || 0,
    hasRsvped: !!userKey && rsvped[i],
  }));
  const batchMsg = `[HOME] batched RSVP queries for ${events.length} events`;
  console.log(batchMsg);
  serverLog("info", batchMsg);

  const eventsByDate: Record<string, MeetitEvent[]> = {};
  for (const event of eventsWithCounts) {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date]!.push(event);
  }

  const postId = context.postId || "";
  const shareUrl = postId ? `https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}/` : "";
  console.log(`[HOME] shareUrl=${shareUrl || "(no postId)"} postId=${postId || "none"}`);

  return {
    type: "home",
    data: {
      eventsByDate,
      isMod: modStatus,
      settings: appSettings,
      shareUrl,
    },
  };
}

async function onEventDetails(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const event = await getActiveEvent(eventId);

  if (!event) {
    return { error: "Event not found", status: 404 };
  }

  const username = context.username || "";
  console.log(`[EVENT-DETAILS] eventId=${eventId} username=${username}`);
  const rsvpCount = await getRsvpCount(eventId);
  const hasRsvped = await isUserRsvped(eventId, username);
  const appSettings = await getSettings();

  return {
    type: "event-details",
    data: { event, rsvpCount, hasRsvped, settings: appSettings },
  };
}

async function onRsvp(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId, email: rawEmail, phone: rawPhone } = await readJSON<{ eventId: string } & RsvpFormData>(req);
  const email = (rawEmail || "").trim();
  const phone = (rawPhone || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email format", status: 400 };
  if (phone && !/^[\d\s\-\+\(\)]{7,20}$/.test(phone)) return { error: "Invalid phone format", status: 400 };
  // C6: Verify event exists before allowing RSVP
  const event = await getActiveEvent(eventId);
  if (!event) return { error: "Event not found", status: 404 };
  const username = context.username;
  if (!username) return { error: "Authentication required", status: 401 };
  // BUG7: detect re-RSVP so client can show "Contact info updated"
  const wasExisting = await isUserRsvped(eventId, username);
  const rsvpMsg = `[RSVP] ${username} → ${eventId} (email=${email ? "yes" : "no"}, phone=${phone ? "yes" : "no"}, update=${wasExisting})`;
  console.log(rsvpMsg); serverLog("info", rsvpMsg);
  await addRsvp(eventId, username, email, phone);

  return { type: "rsvp", success: true, wasExisting };
}

/**
 * Handle the "🎉 Share that I'm going" action from the RSVP success card.
 *
 * Creates a self-post in the subreddit announcing that the user is going to
 * the event. The post is created under the user's account via `runAs: 'USER'`
 * (so it appears as "u/alice is going to ..." in the feed). If that call
 * throws (e.g., the app's `asUser: ["SUBMIT_POST"]` permission is still pending
 * Reddit's user-actions review), the handler falls back to `runAs: 'APP'` and
 * includes `postedAs: "APP"` in the response so the client can surface a
 * non-blocking toast to the user.
 *
 * Rate-limited via Redis: a `meetit:rsvp_share:${eventId}:${username}` key
 * with 24h TTL prevents the same user from sharing the same event twice in
 * 24 hours (which would create duplicate posts in the subreddit).
 *
 * Returns:
 *   { success: true, postUrl, postedAs: "USER" | "APP" } — post created
 *   { success: false, reason: "already_shared" }         — dedup hit
 *   { error, status }                                    — auth/validation errors
 */
async function onRsvpShare(req: IncomingMessage): Promise<ApiResponse> {
  try {
    const { eventId } = await readJSON<{ eventId: string }>(req);
    if (!eventId) return { error: "eventId is required", status: 400 };

    const event = await getActiveEvent(eventId);
    if (!event) return { error: "Event not found", status: 404 };

    const username = context.username;
    if (!username) return { error: "Authentication required", status: 401 };

    // Dedup: prevent the same user from sharing the same event twice in 24h.
    // Key includes eventId so RSVPs to a different event still get a fresh slot.
    const dedupKey = `meetit:rsvp_share:${eventId}:${username}`;
    if (await redis.get(dedupKey)) {
      console.log(`[RSVP-SHARE] ${username} → ${eventId} skipped (already shared within 24h)`);
      return { type: "rsvp-share", success: false, reason: "already_shared" };
    }

    // e28: Fetch the other attendees (everyone EXCEPT the current user) for the
    // "Also going" section in the share post body. zRange with by:"score" returns
    // members in score order (oldest RSVP first). The builder handles sort + cap.
    const rsvpResults = await redis.zRange(`meetit:rsvps:${eventId}`, "-inf", "+inf", { by: "score" });
    const otherAttendees = rsvpResults
      .map((r) => r.member)
      .filter((u) => normalizeUsername(u) !== normalizeUsername(username));
    // e28.9: Log the other-attendees count so we can verify the "Also going"
    // section will be built. 0 = section omitted; >20 = capped with +N more.
    const attendeesMsg = `[RSVP-SHARE] ${username} → ${eventId} otherAttendees=${otherAttendees.length} (cap=20)`;
    console.log(attendeesMsg);
    serverLog("info", attendeesMsg);

    const { title, body } = buildRsvpShareBody(event, username, otherAttendees, context.subredditName);
    const shareMsg = `[RSVP-SHARE] ${username} → ${eventId} title="${title.substring(0, 60)}..."`;
    console.log(shareMsg); serverLog("info", shareMsg);

    // Try user-account posting first (authentic social proof).
    // Falls back to app-account posting on any error so the feature works
    // even when the app's user-actions permission is still pending review.
    //
    // Note: per Devvit docs, `userGeneratedContent` is required for
    // `submitCustomPost` with `runAs: 'USER'`. For `submitPost` (plain text
    // post), the `text` field IS the user-generated content, so we just
    // pass `text` directly. The dev type doesn't allow `userGeneratedContent`
    // on `submitPost` — the platform infers it from the body.
    let post;
    let postedAs: "USER" | "APP" = "USER";
    try {
      post = await reddit.submitPost({
        title,
        text: body,
        subredditName: context.subredditName,
        runAs: "USER",
      });
      console.log(`[RSVP-SHARE] Posted as USER (postId=${post.id} url=${post.url})`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(`[RSVP-SHARE] runAs:USER failed (${errMsg}) — falling back to APP`);
      serverLog("error", `rsvp-share USER fallback: ${errMsg}`);
      post = await reddit.submitPost({
        title,
        text: body,
        subredditName: context.subredditName,
        runAs: "APP",
      });
      postedAs = "APP";
      console.log(`[RSVP-SHARE] Posted as APP (postId=${post.id} url=${post.url})`);
    }

    // e28.8: Validate post.url before declaring success. If the post object
    // somehow lacks a url (rare platform edge case), do NOT set the dedup key
    // and return an error so the user can retry. Without this check, a missing
    // url would cause the client to show "share failed" while the server still
    // set the dedup key — leaving the user in a state where they can't retry
    // (next click says "already shared") and there's no post to navigate to.
    if (!post || !post.url) {
      const errMsg = `[RSVP-SHARE] Post created but url is missing (postId=${post?.id ?? "unknown"}, postedAs=${postedAs})`;
      console.error(errMsg);
      serverLog("error", errMsg);
      return { error: "Post created but URL not available - please retry", status: 500 };
    }

    // Set dedup key with 24h TTL — only after we have a confirmed post with a url.
    // If the post creation succeeded under the user's account, this prevents
    // a second click from creating a duplicate. If it fell back to APP, this
    // also prevents a duplicate under the app account.
    try {
      await redis.set(dedupKey, "1", { expiration: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    } catch (e) {
      // Non-fatal: log the dedup failure but still return success since the
      // post was created. Worst case: user can share again within 24h.
      console.error(`[RSVP-SHARE] Failed to set dedup key: ${e}`);
    }

    return { type: "rsvp-share", success: true, postUrl: post.url, postedAs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[RSVP-SHARE] Unexpected error: ${msg}`);
    serverLog("error", `rsvp-share unexpected: ${msg}`);
    return { error: "Internal error", status: 500 };
  }
}

async function onPitchIdea(req: IncomingMessage): Promise<ApiResponse> {
  const { title, description, proposedDate, proposedTime } = await readJSON<PitchFormData>(req);
  if (!title || title.length > 200) return { error: "Title too long", status: 400 };
  if (!description || description.length > 2000) return { error: "Description too long", status: 400 };
  // proposedDate / proposedTime are optional; if provided, they should look like a date / time
  if (proposedDate && !/^\d{4}-\d{2}-\d{2}$/.test(proposedDate)) return { error: "Invalid date format", status: 400 };
  if (proposedTime && !/^\d{2}:\d{2}$/.test(proposedTime)) return { error: "Invalid time format", status: 400 };
  const username = context.username || "unknown";
  console.log(`[PITCH] "${title}" by u/${username}` + (proposedDate ? ` proposed=${proposedDate}@${proposedTime || "?"}` : ""));

  const ideaId = `idea_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idea: { id: string; title: string; description: string; submittedBy: string; submittedAt: string; proposedDate?: string; proposedTime?: string } = {
    id: ideaId, title, description, submittedBy: username, submittedAt: new Date().toISOString()
  };
  if (proposedDate) idea.proposedDate = proposedDate;
  if (proposedTime) idea.proposedTime = proposedTime;
  await redis.hSet("meetit:pitched_ideas", { [ideaId]: JSON.stringify(idea) });

  // Notification comment disabled - submitComment not available in Devvit Web
  // await notifyMods(`💡 New pitch idea...`);
  return { type: "pitch-idea", success: true };
}

// Helper: disabled — reddit.submitComment() is broken in Devvit Web
// Kept as a no-op so future callers don't crash. Use save-to-Redis pattern instead.
export async function notifyMods(message: string): Promise<void> {
  console.log(`[NOTIFY] disabled (submitComment broken) | msgLen=${message?.length} | use Mod Dashboard instead`);
}

async function onSubmitEvent(req: IncomingMessage): Promise<ApiResponse> {
  const formData = await readJSON<SubmitEventFormData>(req);
  if (!formData.title || formData.title.length > 200) return { error: "Title too long", status: 400 };
  if (!formData.desc || formData.desc.length > 2000) return { error: "Description too long", status: 400 };
  if (!formData.location || formData.location.length > 200) return { error: "Location too long", status: 400 };
  const today = new Date().toISOString().split("T")[0] || "";
  if (formData.date < today) return { error: "Event date must be today or in the future", status: 400 };
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const event = createPendingEvent(eventId, formData, new Date().toISOString());

  await redis.hSet("meetit:pending_events", { [eventId]: JSON.stringify(event) });
  console.log(`[SUBMIT] "${event.title}" by ${context.username} | id=${eventId} | category=${event.category || "(none)"} | emoji=${event.emoji || "(none)"}`);
  return { type: "submit-event", success: true };
}

async function onApproveEvent(req: IncomingMessage): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const eventJson = await redis.hGet("meetit:pending_events", eventId);

  // C7: Return 404 if event doesn't exist in pending
  if (!eventJson) {
    console.log(`[APPROVE] ${eventId} not found in pending events`);
    return { error: "Event not found in pending queue", status: 404 };
  }

  // Distributed lock: prevent double-approve race conditions
  const lockKey = `meetit:approve_lock:${eventId}`;
  const lockAcquired = await redis.hSetNX(lockKey, "status", "approving");
  if (!lockAcquired) {
    console.log(`[APPROVE] ${eventId} already being approved - skipping`);
    return { error: "Event is being approved by another moderator", status: 409 };
  }
  await redis.expire(lockKey, 10); // 10s TTL prevents deadlock

  await redis.hSet("meetit:active_events", { [eventId]: eventJson });
  await redis.hDel("meetit:pending_events", [eventId]);
  const event = JSON.parse(eventJson) as MeetitEvent;

  // e28: Auto-RSVP the organizer so they appear in their own event's
  // attendee list (and in My Stuff → RSVPs). zAdd is idempotent — re-approving
  // an already-RSVPed organizer is a no-op. Skip if organizer is empty
  // (defensive — should never happen since the form requires it).
  const organizerKey = normalizeUsername(event.organizer || "");
  if (organizerKey) {
    await redis.zAdd(`meetit:rsvps:${eventId}`, { score: Date.now(), member: organizerKey });
    const autoRsvpMsg = `[APPROVE] auto-RSVPed organizer u/${organizerKey} → ${eventId}`;
    console.log(autoRsvpMsg);
    serverLog("info", autoRsvpMsg); // e28.9: also write to in-app debug panel
  } else {
    const skipMsg = `[APPROVE] skipped auto-RSVP for ${eventId} (organizer field empty)`;
    console.warn(skipMsg);
    serverLog("warn", skipMsg);
  }

  console.log(`[APPROVE] ${event.title} approved`);
  return { type: "approve-event", success: true };
}

async function onPendingEvents(): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const events = await getPendingEventsList();
  console.log(`[PENDING] ${events.length} pending events`);
  return { type: "pending-events", events };
}

async function onPitchedIdeas(): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const ideas = await redis.hGetAll("meetit:pitched_ideas");
  const ideasList = Object.values(ideas).map((val) => safeJSONParse(val)).filter((i): i is any => i !== null);
  console.log(`[PITCHES] ${ideasList.length} pitched ideas`);
  return { type: "pitched-ideas", ideas: ideasList };
}

async function onAllApprovedEvents(): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const events = await getAllApprovedEvents();
  console.log(`[ALL-APPROVED] Total approved events in Redis: ${events.length}`);
  // Filter out hardcoded default event
  const realEvents = events.filter(e => e.id !== "default-bangalore-tech-chai");
  // PERF2: batch zCard counts for all published events
  const counts = await Promise.all(
    realEvents.map((event) => redis.zCard(`meetit:rsvps:${event.id}`))
  );
  const eventsWithCounts = realEvents.map((event, i) => ({ ...event, rsvpCount: counts[i] || 0 }));
  const perf2Msg = `[ALL-APPROVED] batched RSVP counts for ${realEvents.length} events`;
  console.log(perf2Msg);
  serverLog("info", perf2Msg);
  console.log(`[ALL-APPROVED] Returning ${eventsWithCounts.length} events to mod dashboard`);
  return { type: "all-approved-events", events: eventsWithCounts };
}

async function onDismissIdea(req: IncomingMessage): Promise<ApiResponse> {
  const { ideaId } = await readJSON<{ ideaId: string }>(req);
  const ideaJson = await redis.hGet("meetit:pitched_ideas", ideaId);
  if (ideaJson) {
    const idea = JSON.parse(ideaJson) as { submittedBy?: unknown };
    if (!isSubmissionOwner(context.username, idea.submittedBy)) {
      const authError = await requireMod();
      if (authError) return authError;
    }
  }
  await redis.hDel("meetit:pitched_ideas", [ideaId]);
  console.log(`[DISMISS] Idea ${ideaId} removed`);
  return { type: "dismiss-idea", success: true };
}

async function onDeletePending(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const eventJson = await redis.hGet("meetit:pending_events", eventId);
  if (eventJson) {
    const event = JSON.parse(eventJson) as MeetitEvent;
    if (!isSubmissionOwner(context.username, event.organizer)) {
      const authError = await requireMod();
      if (authError) return authError;
    }
  }
  await redis.hDel("meetit:pending_events", [eventId]);
  console.log(`[DEL-PEND] ${eventId} removed`);
  return { type: "delete-pending", success: true };
}

async function onDeletePublished(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const eventJson = await redis.hGet("meetit:active_events", eventId);
  if (eventJson) {
    const event = JSON.parse(eventJson) as MeetitEvent;
    if (!isSubmissionOwner(context.username, event.organizer)) {
      const authError = await requireMod();
      if (authError) return authError;
    }
  }
  await redis.hDel("meetit:active_events", [eventId]);
  // Clean up all RSVP data for this event (C1: PII leak fix)
  const rsvpKey = `meetit:rsvps:${eventId}`;
  const detailsKey = `meetit:rsvp_details:${eventId}`;
  const members = await redis.zRange(rsvpKey, "-inf", "+inf", { by: "score" });
  if (members.length > 0) await redis.zRem(rsvpKey, members.map(m => m.member));
  const detailFields = await redis.hKeys(detailsKey);
  if (detailFields.length > 0) await redis.hDel(detailsKey, detailFields);
  console.log(`[DEL-PUB] ${eventId} removed | rsvp_members=${members.length}`);
  return { type: "delete-published", success: true };
}

async function onLeaveEvent(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const username = context.username;
  if (!username) return { error: "Authentication required", status: 401 };
  const userKey = normalizeUsername(username);
  const key = `meetit:rsvps:${eventId}`;
  console.log(`[LEAVE] Removing ${username} from ${key}`);

  // zRem with array is what works (write-behind, eventually consistent)
  const rsvpEntries = await redis.zRange(key, "-inf", "+inf", { by: "score" });
  const membersToRemove = rsvpEntries
    .map((entry) => entry.member)
    .filter((member) => normalizeUsername(member) === userKey);
  if (membersToRemove.length > 0) await redis.zRem(key, membersToRemove);

  // C1: PII leak fix — also remove contact details when user leaves
  const detailsKey = `meetit:rsvp_details:${eventId}`;
  const detailFields = await redis.hKeys(detailsKey);
  const detailFieldsToRemove = detailFields.filter((field) => normalizeUsername(field) === userKey);
  if (detailFieldsToRemove.length > 0) await redis.hDel(detailsKey, detailFieldsToRemove);

  // Don't verify immediately - Redis in Devvit is eventually consistent
  // The next event-details fetch will show the correct state
  return { type: "leave-event", success: true };
}

async function onRsvpList(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId, includeContactDetails } = await readJSON<{ eventId: string; includeContactDetails?: boolean }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const results = await redis.zRange(`meetit:rsvps:${eventId}`, "-inf", "+inf", { by: "score" });
  console.log(`[RSVP-LIST] ${eventId} | ${results.length} attendees | contact=${!!includeContactDetails}`);
  // Fetch contact details from companion hash
  const detailsHash = await redis.hGetAll(`meetit:rsvp_details:${eventId}`);
  const canViewContactDetails = Boolean(includeContactDetails) && (await isMod());
  const attendees = buildAttendees(results, detailsHash, canViewContactDetails);
  return { type: "rsvp-list", attendees };
}

async function onMyRsvp(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };
  const username = normalizeUsername(context.username || "");
  const detailsKey = `meetit:rsvp_details:${eventId}`;
  let detailsRaw = await redis.hGet(detailsKey, username);
  if (!detailsRaw) {
    const detailFields = await redis.hKeys(detailsKey);
    const legacyField = detailFields.find((field) => normalizeUsername(field) === username);
    if (legacyField) detailsRaw = await redis.hGet(detailsKey, legacyField);
  }
  const details = detailsRaw ? JSON.parse(detailsRaw) : { email: "", phone: "" };
  console.log(`[MY-RSVP] ${eventId} | user=${username} | hasEmail=${!!details.email} | hasPhone=${!!details.phone}`);
  return { type: "my-rsvp", email: details.email || "", phone: details.phone || "" };
}

async function onMySubmissions(): Promise<ApiResponse> {
  const normUser = normalizeUsername(context.username || "");
  const matchOrg = (org: string) => org?.toLowerCase().replace(/^u\//, "") === normUser;

  // Pitches
  const pitchesJson = await redis.hGetAll("meetit:pitched_ideas");
  const pitches = Object.values(pitchesJson)
    .map((val) => safeJSONParse(val)).filter((i): i is any => i !== null)
    .filter((idea: any) => (idea.submittedBy || "").toLowerCase() === normUser);

  // Pending events (organized by user)
  const pendingJson = await redis.hGetAll("meetit:pending_events");
  const pendingEvents = Object.values(pendingJson)
    .map((val) => safeJSONParse(val)).filter((e): e is MeetitEvent => e !== null)
    .filter((event: MeetitEvent) => matchOrg(event.organizer || ""))
    .map(e => ({ ...e, status: "pending" }));

  // Active events (organized by user)
  const activeJson = await redis.hGetAll("meetit:active_events");
  const activeEvents = Object.values(activeJson)
    .map((val) => safeJSONParse(val)).filter((e): e is MeetitEvent => e !== null)
    .filter((event: MeetitEvent) => matchOrg(event.organizer || ""))
    .map(e => ({ ...e, status: "published" }));

  // RSVP'd events (events the user is attending, not organizing)
  // PERF3: batch zScore queries instead of sequential loop
  const rsvpEvents: any[] = [];
  const activeEntries = Object.entries(activeJson);
  const rsvpScores = await Promise.all(
    activeEntries.map(([eventId, eventJson]) =>
      Promise.all([
        redis.zScore(`meetit:rsvps:${eventId}`, normUser),
        redis.zCard(`meetit:rsvps:${eventId}`),
      ]).then(([score, count]) => ({ eventId, eventJson, score, count }))
    )
  );

  // e28: Build eventId → attendee count map from the same batch query so we
  // can attach rsvpCount to myEvents too (used by the "👥 N Attendees" button
  // on My Stuff → My Events). Pending events have 0 RSVPs by definition.
  const eventIdToCount = new Map<string, number>();
  for (const { eventId, count } of rsvpScores) {
    eventIdToCount.set(eventId, count);
  }

  // Annotate active events with rsvpCount
  const activeEventsWithCount = activeEvents.map((e) => ({
    ...e,
    rsvpCount: eventIdToCount.get(e.id) || 0,
  }));

  const myEvents = [...pendingEvents, ...activeEventsWithCount];

  for (const { eventJson, score, count } of rsvpScores) {
    if (score != null) {
      const event = JSON.parse(eventJson);
      rsvpEvents.push({ ...event, status: "rsvpd", rsvpScore: score, rsvpCount: count });
    }
  }
  // e28.9: Per-event rsvpCount summary for myEvents (e28.4 verification).
  // Only log events with at least 1 RSVP — avoids log spam for empty events.
  const nonEmpty = activeEventsWithCount.filter((e) => (e.rsvpCount || 0) > 0);
  if (nonEmpty.length > 0) {
    const summary = nonEmpty
      .map((e) => `${e.title.substring(0, 30)}=${e.rsvpCount}`)
      .join(", ");
    const msg = `[MY-SUBMISSIONS] myEvents-rsvpCount: ${summary}`;
    console.log(msg);
    serverLog("info", msg);
  }
  console.log(`[MY-SUBMISSIONS] pitches=${pitches.length} myEvents=${myEvents.length} rsvps=${rsvpEvents.length}`);

  return { type: "my-submissions", pitches, events: myEvents, rsvps: rsvpEvents };
}

async function onServerLogs(): Promise<ApiResponse> {
  // H1 fix: server logs include usernames, event IDs, RSVP actions, contact-
  // presence flags, and error messages. The /api/server-logs endpoint now
  // requires mod authentication. The client-side debug panel is also hidden
  // for non-mods (see app.ts:DOMContentLoaded), but the server check is the
  // security boundary — never trust the client.
  const authError = await requireMod();
  if (authError) {
    const user = context.username || "unknown";
    const deniedMsg = `[SERVER-LOGS] DENIED access to /api/server-logs for non-mod u/${user}`;
    console.warn(deniedMsg);
    serverLog("warn", deniedMsg);
    return authError;
  }
  try {
    const results = await redis.zRange("meetit:server_logs", "-inf", "+inf", { by: "score" });
    const logs = results.map((r) => safeJSONParse(r.member)).filter((l): l is { ts: number; level: string; msg: string } => l !== null);
    const okMsg = `[SERVER-LOGS] Returning ${logs.length} entries to mod u/${context.username}`;
    console.log(okMsg);
    serverLog("info", okMsg);
    return { type: "server-logs", logs };
  } catch (e) {
    console.log(`[SERVER-LOGS] Error: ${e}`);
    return { type: "server-logs", logs: [] };
  }
}

async function onExportAttendees(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  if (!eventId) return { error: "Missing eventId", status: 400 };

  // Verify user is mod or event organizer
  const userIsMod = await isMod();
  const eventJson = await redis.hGet("meetit:active_events", eventId);
  if (!eventJson) return { error: "Event not found", status: 404 };
  const event = JSON.parse(eventJson) as MeetitEvent;
  const isOwner = isSubmissionOwner(context.username, event.organizer);
  if (!userIsMod && !isOwner) return { error: "Unauthorized", status: 403 };

  // Fetch RSVPs with contact details
  const results = await redis.zRange(`meetit:rsvps:${eventId}`, 0, -1, { by: "rank", reverse: false });
  const rsvpMembers = results.map((entry) => entry.member);
  const detailsHash = rsvpMembers.length > 0 ? await redis.hGetAll(`meetit:rsvp_details:${eventId}`) : {};
  const attendees = buildAttendees(results as any, detailsHash, true);

  // Build CSV with safe escaping (RFC 4180 + formula-injection guard).
  const header = [csvEscape("Username"), csvEscape("Email"), csvEscape("Phone")].join(",");
  const lines = [header];
  for (const a of attendees) {
    lines.push([csvEscape(a.username), csvEscape(a.email), csvEscape(a.phone)].join(","));
  }
  const csv = lines.join("\n");
  const filename = `attendees_${eventId}_${new Date().toISOString().split("T")[0]}.csv`;
  console.log(`[EXPORT] ${eventId} | ${attendees.length} attendees | by ${context.username}`);
  return { type: "export-attendees", csv, filename };
}

// Disabled: sendPrivateMessage(to: username) fails with ERR_INVALID_ARG_TYPE in Devvit Web.
// Reminders are now handled by the active CRON in onCheckEvents() which posts a public reminder instead.
export async function onSendReminders(req: IncomingMessage): Promise<TaskResponse> {
  void req;
  console.log(`[SCHEDULER] send_24hr_reminders disabled — use onCheckEvents CRON for reminders`);
  return { status: "ok" };
}

async function onMenuCreatePost(): Promise<UiResponse> {
  try {
    const post = await reddit.submitCustomPost({
      title: "Meetit - Community Meetups",
    });
    // Persist the launcher post ID so reminder posts can deep-link to it (e26).
    // Wrapped in try/catch so a Redis write failure does NOT block the post UX —
    // the post is already created; the only loss is that the next reminder will
    // fall back to the subreddit homepage deep link.
    try {
      await redis.set("meetit:meetit_app_post_id", post.id);
      console.log(`[MENU] Saved meetit_app_post_id=${post.id} (url=${post.url})`);
    } catch (e) {
      console.error(`[MENU] Failed to persist meetit_app_post_id: ${e}`);
    }
    return {
      showToast: { text: `Meetit post created!`, appearance: "success" },
      navigateTo: post.url,
    };
  } catch (e) {
    console.error(`Failed to create post: ${e}`);
    return {
      showToast: { text: `Failed to create post: ${e}`, appearance: "neutral" },
    };
  }
}

async function onAppInstall(): Promise<Record<string, never>> {
  return {};
}

async function onAppUpgrade(): Promise<Record<string, never>> {
  return {};
}

function writeJSON<T extends PartialJsonValue>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json);
  const len = Buffer.byteLength(body);
  rsp.writeHead(status, {
    "Content-Length": len,
    "Content-Type": "application/json",
  });
  rsp.end(body);
}

async function readRaw(req: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  await once(req, "end");
  return `${Buffer.concat(chunks)}`;
}

async function onCheckEvents(req: IncomingMessage): Promise<TaskResponse> {
  void req;
  const cronMsg = `[CRON] check-events FIRED at ${new Date().toISOString()}`;
  console.log(cronMsg); serverLog("info", cronMsg);
  try {
    // Distributed lock: prevent overlapping CRON runs
    const cronLock = await redis.hSetNX("meetit:cron_lock", "lock", Date.now().toString());
    if (!cronLock) {
      console.log(`[CRON] Lock held by another instance - skipping`);
      return { status: "ok", skipped: true };
    }
    await redis.expire("meetit:cron_lock", 240); // 4 min TTL (CRON runs every 5 min)

    const allEvents = await redis.hGetAll("meetit:active_events");

    // === 1. Reminder posts for upcoming events ===
    const timezone = normalizeTimezone(await settings.get("timezone"));
    const tzSign = timezone.startsWith("-") ? "-" : "+";
    const tzValue = timezone.replace(/^[+-]/, ""); // e.g. "05:30"
    const tzOffset = tzSign + tzValue; // e.g. "+05:30" or "-05:00"
    const reminderHours = Number(await settings.get("reminder_hours")) || 24;
    // Fetch moderator list once per CRON run; used in reminder body so attendees
    // can reach mods directly from the post. Empty list = line omitted entirely.
    const modList = parseModList(await settings.get("mod_usernames"));
    // Fallback organizer: use app account so the body always has a contact line.
    const fallbackOrganizer = context.username || "meetit-app";
    // Look up the most recent Meetit app launcher post so the "Open in Meetit"
    // deep link points to the actual app post (not the subreddit homepage).
    // The key is written by `onMenuCreatePost` whenever a mod creates a launcher
    // post via the subreddit menu. If no launcher exists yet, this is empty
    // and the body builder falls back to the subreddit homepage with a hint.
    const meetitAppPostId = (await redis.get("meetit:meetit_app_post_id")) || "";
    const meetitAppPostUrl = meetitAppPostId
      ? `https://www.reddit.com/comments/${meetitAppPostId.replace(/^t3_/, "")}/`
      : undefined;

    // e28: Batch-fetch attendees for all active events. Used by reminder posts
    // to show "👥 N going: u/user1 u/user2 ...". One zRange per event is cheap,
    // but batching all into Promise.all keeps the CRON fast.
    const attendeesByEvent: Record<string, string[]> = {};
    await Promise.all(
      Object.entries(allEvents).map(async ([eventId, _eventJson]) => {
        const results = await redis.zRange(`meetit:rsvps:${eventId}`, "-inf", "+inf", { by: "score" });
        attendeesByEvent[eventId] = results.map((r) => r.member);
      })
    );

    for (const [eventId, eventJson] of Object.entries(allEvents)) {
      const event = JSON.parse(eventJson);
      // Parse date+time together for accurate reminder timing using configured timezone
      const eventDateTime = new Date(event.date + "T" + (event.time || "00:00") + ":00" + tzOffset);
      const eventTs = eventDateTime.getTime();
      const nowTs = Date.now();
      const hoursUntilEvent = (eventTs - nowTs) / 3600000;

      // Retry window: also allow posts up to 1h after event start (was: skip past events).
      // This covers CRON downtime — a missed reminder still fires once the next tick runs.
      if (hoursUntilEvent > reminderHours || hoursUntilEvent < -1) continue;
      const remindedKey = `meetit:reminded:${eventId}`;
      if (await redis.get(remindedKey)) continue;
      // e28.9: Log the attendees count included in this reminder body so we can
      // verify the "N going" section was built. 0 = section omitted.
      const reminderAttendees = attendeesByEvent[event.id] || [];
      const reminderLogMsg = `[CRON] Reminder post for ${event.title} attendees=${reminderAttendees.length} (cap=20)`;
      console.log(reminderLogMsg);
      serverLog("info", reminderLogMsg);
      try {
        // Use submitPost (not submitCustomPost) to create a plain text post.
        // submitCustomPost always renders the app iframe on new.reddit/mobile,
        // which is bad for discussion: the body is hidden behind the iframe and
        // there's no obvious entry point for comments. A plain text post shows
        // the body on every Reddit client and gets the full comment thread UI.
        // See: https://developers.reddit.com/docs/capabilities/server/reddit-api#submitting-a-post
        const post = await reddit.submitPost({
          title: buildReminderTitle(event),
          text: buildReminderBody(
            event,
            (event.organizer && event.organizer.trim()) || fallbackOrganizer,
            modList,
            // e28: pass attendee list so the post body shows who is going.
            attendeesByEvent[event.id] || [],
            context.subredditName,
            meetitAppPostUrl,
          ),
        });
        // Set dedup flag ONLY after successful post so failures retry on next tick.
        await redis.set(remindedKey, "true");
        await redis.expire(remindedKey, 86400);
        const successMsg = `[CRON] Reminder post sent for ${event.title} (postId=${post?.id ?? "unknown"})`;
        console.log(successMsg);
        serverLog("info", successMsg);
      } catch (e) {
        const errMsg = `[CRON] Post failed for ${event.title}: ${e instanceof Error ? e.message : e}`;
        console.error(errMsg);
        serverLog("error", errMsg);
      }
    }

    // === 2. Mod alerts for new pending items ===
    const pendingKey = "meetit:last_alert_check";
    const lastCheckRaw = await redis.get(pendingKey);
    const nowTs = Date.now().toString();
    const pendingEvents = await redis.hGetAll("meetit:pending_events");
    const pitchedIdeas = await redis.hGetAll("meetit:pitched_ideas");
    // BUG3: on first CRON run, initialize lastCheck to now and skip alerting for existing items
    if (!lastCheckRaw) {
      const firstRunMsg = `[CRON] First run - skipping alert for existing items`;
      console.log(firstRunMsg);
      serverLog("info", firstRunMsg);
      await redis.set(pendingKey, nowTs);
      return { status: "ok", skipped: true };
    }
    const lastCheck = lastCheckRaw;
    let newItems = 0;
    for (const [, json] of Object.entries({ ...pendingEvents, ...pitchedIdeas })) {
      const item = JSON.parse(json);
      const submittedAt = new Date(item.submittedAt || item.submittedAt || 0).getTime();
      if (submittedAt > parseInt(lastCheck)) newItems++;
    }
    if (newItems > 0) {
      console.log(`[CRON] ${newItems} new items since last check`);
      // Notify mods via modmail only (no public posts)
      try {
        await reddit.sendPrivateMessage({ subject: `Meetit: ${newItems} new item(s) await review`, text: `There are ${newItems} new pending event(s) or pitch(es) to review.\n\nOpen the Meetit app in r/${context.subredditName} to manage them.`, to: `/r/${context.subredditName}` });
        console.log(`[CRON] Mod alert sent`);
      } catch (e) { console.log(`[CRON] Mod alert failed (may not be supported): ${e}`); }
    }
    await redis.set(pendingKey, nowTs);

    console.log(`[CRON] check-events complete`);
    return { status: "ok" };
  } catch (e) {
    console.error(`[CRON] Error: ${e}`);
    return { status: "error", message: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function readJSON<T>(req: IncomingMessage): Promise<T> {
  const raw = await readRaw(req);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}
