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
import { buildAnnouncementTitle, buildApproveDm, buildAttendees, buildCleanupLogEntry, buildReminderBody, buildReminderTitle, buildRsvpShareBody, createPendingEvent, csvEscape, isConfiguredModerator, isEventAgedOut, isEventPast, isPitchAgedOut, isSubmissionOwner, normalizeUsername, parseQueryParam, pickAgedItems, pitchEffectiveStatus, stripQueryString, validateDismissReason } from "../shared/meetit.ts";
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

// pitch-feedback-loop: strip query string from URL so the switch can match
// the path-only endpoint, while preserving the original URL on req for
// handlers that need to parse query params (e.g. ?status=).
function endpointPath(rawUrl: string | undefined): string {
  return stripQueryString(rawUrl);
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

  const endpoint = endpointPath(url) as ApiEndpoint | InternalEndpoint;
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
      body = await onPitchedIdeas(req);
      break;
    case ApiEndpoint.AllApprovedEvents:
      body = await onAllApprovedEvents();
      break;
    case ApiEndpoint.DismissIdea:
      body = await onDismissIdea(req);
      break;
    case ApiEndpoint.ApproveIdea:
      body = await onApproveIdea(req);
      break;
    case ApiEndpoint.CleanupAged:
      body = await onCleanupAged(req);
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
    case InternalEndpoint.CheckCleanupAged:
      body = await onCleanupAged(req);
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
  CheckCleanupAged: "/internal/scheduler/cleanup-aged",
} as const;

type InternalEndpoint = (typeof InternalEndpoint)[keyof typeof InternalEndpoint];

type ApiResponse =
  | { type: "init"; postId: string; username: string; isMod: boolean; settings: AppSettings; timezone: string }
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
  | { type: "pitched-ideas"; ideas: any[]; counts: { pending: number; dismissed: number; all: number } }
  | { type: "all-approved-events"; events: any[] }
  | { type: "dismiss-idea"; success: boolean }
  | { type: "approve-idea"; success: boolean }
  | { type: "delete-pending"; success: boolean }
  | { type: "delete-published"; success: boolean }
  | { type: "cleanup-aged"; eventsActive: number; eventsPending: number; pitches: number }
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
    const [primary, secondary, borders, showDebug, tz, cleanupDays, pauseCleanup] = await Promise.all([
      settings.get("primary_color"),
      settings.get("secondary_color"),
      settings.get("use_brutalist_borders"),
      settings.get("show_debug_panel"),
      settings.get("timezone"),
      settings.get("cleanup_after_days"),
      settings.get("pause_cleanup"),
    ]);
    const showDebugPanel = (showDebug as boolean) === true;
    // aged-cleanup-mode: threshold parsed as a number, validated to 1-365 in
    // the cleanup handler. Defensive default: 30 (the documented default).
    const cleanupAfterDays = Math.max(1, Math.min(365, Number(cleanupDays) || 30));
    const pauseCleanupFlag = (pauseCleanup as boolean) === true;
    return {
      primary_color: (primary as string) || "#ffff00",
      secondary_color: (secondary as string) || "#ff69b4",
      use_brutalist_borders: (borders as boolean) !== false,
      show_debug_panel: showDebugPanel,
      timezone: normalizeTimezone(tz),
      cleanup_after_days: cleanupAfterDays,
      pause_cleanup: pauseCleanupFlag,
    };
  } catch (e) {
    console.error(`getSettings error: ${e}`);
    return {
      primary_color: "#ffff00",
      secondary_color: "#ff69b4",
      use_brutalist_borders: true,
      show_debug_panel: false,
      timezone: "+05:30",
      cleanup_after_days: 30,
      pause_cleanup: false,
    };
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
    const writeMsg = `[FIX-04-WRITE] rsvp-details-written eventId=${eventId} user=${userKey} hasEmail=${!!email} hasPhone=${!!phone}`;
    console.log(writeMsg);
    serverLog("info", writeMsg);
  } else {
    // FIX-04 (pre-launch-bugs): blank email AND blank phone means the user
    // wants their contact info removed. Currently the hash entry would
    // linger, so mods and CSV exports would still see the old data. hDel it.
    const deleted = await redis.hDel(`meetit:rsvp_details:${eventId}`, [userKey]);
    if (deleted > 0) {
      const clearMsg = `[FIX-04-CLEAR] rsvp-details-cleared eventId=${eventId} user=${userKey} (hDel returned ${deleted})`;
      console.log(clearMsg);
      serverLog("info", clearMsg);
    } else {
      const noopMsg = `[FIX-04-CLEAR] rsvp-details-noop eventId=${eventId} user=${userKey} (no prior contact info to clear)`;
      console.log(noopMsg);
      serverLog("info", noopMsg);
    }
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
  // FIX-02 (pre-launch-bugs): block RSVP to past events. Defensive explicit
  // date check; the UI prevents this, but direct API calls and stale Redis
  // state could otherwise allow it. isEventPast returns false (allow) for
  // malformed dates so a typo doesn't silently block valid RSVPs.
  if (isEventPast(event)) {
    const blockMsg = `[FIX-02-BLOCK] rsvp-past-event-blocked eventId=${eventId} eventDate=${event.date} user=${context.username || "anon"}`;
    console.warn(blockMsg);
    serverLog("warn", blockMsg);
    return { error: "Cannot RSVP to past events", status: 400 };
  }
  const allowMsg = `[FIX-02-ALLOW] rsvp eventId=${eventId} eventDate=${event.date} user=${context.username || "anon"}`;
  console.log(allowMsg);
  serverLog("info", allowMsg);
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

  // pitch-feedback-loop: best-effort DM confirmation. Failure does NOT block
  // the submission (the pitch is already saved). The My Stuff row + toast are
  // the source of truth; the DM is a courtesy.
  try {
    await reddit.sendPrivateMessage({
      to: username,
      subject: "💡 Your idea was received",
      text: `Hey u/${username}! Your pitch "${title}" was received. Mods will review it soon. Track its status in My Stuff → Pitches (👤 → 💡 Pitches). — Meetit`,
    });
    const dmOk = `[PITCH] DM confirmation sent to u/${username}`;
    console.log(dmOk);
    serverLog("info", dmOk);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const dmFail = `[PITCH] DM confirmation failed for u/${username}: ${errMsg}`;
    console.log(dmFail);
    serverLog("warn", dmFail);
  }

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
  serverLog("info", `[APPROVE] ${event.title} approved`);

  // event-announcement-post: create a public announcement post on the
  // subreddit so the community can start planning and discussing the event
  // immediately. The post is best-effort — a Reddit API failure does NOT
  // block the approval (the event is already in meetit:active_events and
  // the organizer is auto-RSVPed). Failure is logged; the post URL is
  // stored at meetit:event_post:${eventId} for future reference.
  try {
    const meetitAppPostId = (await redis.get("meetit:meetit_app_post_id")) || "";
    const meetitAppPostUrl = meetitAppPostId
      ? `https://www.reddit.com/comments/${meetitAppPostId.replace(/^t3_/, "")}/`
      : undefined;
    // Look up the mod list (for the "Moderators:" line in the post body).
    // Falls back to the empty array if the setting is unset. Same pattern
    // as onCheckEvents.
    const modListStr = ((await settings.get("mod_usernames")) as string) || "";
    const modList = modListStr
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    const organizerForBody = (event.organizer && event.organizer.trim()) || context.username || "the organizer";
    const announcementTitle = buildAnnouncementTitle(event);
    const announcementBody = buildReminderBody(
      event,
      organizerForBody,
      modList,
      [], // empty attendees — no one has RSVPed yet on approval
      context.subredditName,
      meetitAppPostUrl,
    );
    const post = await reddit.submitPost({
      title: announcementTitle,
      text: announcementBody,
    });
    await redis.set("meetit:event_post:" + eventId, post.url);
    const annMsg = `[APPROVE] announcement post created url=${post.url} for ${event.title}`;
    console.log(annMsg);
    serverLog("info", annMsg);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const failMsg = `[APPROVE] announcement post FAILED for ${eventId}: ${errMsg}`;
    console.log(failMsg);
    serverLog("warn", failMsg);
  }

  return { type: "approve-event", success: true };
}

async function onPendingEvents(): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const events = await getPendingEventsList();
  console.log(`[PENDING] ${events.length} pending events`);
  return { type: "pending-events", events };
}

// pitch-feedback-loop: extract the `?status=` query param from the request
// URL. Returns the raw value or undefined if absent.
function queryParam(req: IncomingMessage, name: string): string | undefined {
  return parseQueryParam(req.url, name);
}

async function onPitchedIdeas(req: IncomingMessage): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const raw = queryParam(req, "status");
  // pitch-approve: filter accepts "approved" as a third state. Unknown /
  // missing values default to "pending" (back-compat with the
  // pitch-feedback-loop change).
  const filter: "pending" | "dismissed" | "approved" | "all" =
    raw === "dismissed" || raw === "approved" || raw === "all" ? raw : "pending";
  const ideas = await redis.hGetAll("meetit:pitched_ideas");
  const ideasList = Object.values(ideas).map((val) => safeJSONParse(val)).filter((i): i is any => i !== null);
  // Counts across the full set (independent of the current filter), so the
  // client can render "View dismissed (N)" and "View approved (N)" links
  // from the pending view. pitch-approve: extended to include approved.
  const counts = { pending: 0, approved: 0, dismissed: 0, all: ideasList.length };
  for (const idea of ideasList) {
    const s = pitchEffectiveStatus(idea);
    if (s === "dismissed") counts.dismissed++;
    else if (s === "approved") counts.approved++;
    else counts.pending++;
  }
  const filtered = filter === "all" ? ideasList : ideasList.filter((i) => pitchEffectiveStatus(i) === filter);
  console.log(`[PITCHES] status=${filter} n=${filtered.length} (counts pending=${counts.pending} approved=${counts.approved} dismissed=${counts.dismissed})`);
  return { type: "pitched-ideas", ideas: filtered, counts };
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
  const { ideaId, reason } = await readJSON<{ ideaId: string; reason?: string }>(req);
  if (!ideaId) return { error: "Missing ideaId", status: 400 };
  const ideaJson = await redis.hGet("meetit:pitched_ideas", ideaId);
  if (!ideaJson) return { error: "Idea not found", status: 404 };
  const idea = safeJSONParse(ideaJson) as { submittedBy?: unknown } | null;
  if (!idea) return { error: "Idea not found", status: 404 };

  // pitch-feedback-loop: branch by actor. The OWNER path keeps the legacy
  // hDel behavior (no reason, no status field, row vanishes from My Stuff)
  // and takes priority over mod status — if the user submitted the pitch,
  // they can always remove it from their own view without a reason, even
  // if they also happen to be a mod. The MOD path soft-saves with
  // status="dismissed" + a required reason so the pitcher sees a status
  // line in My Stuff instead of a vanishing row.
  const isOwner = isSubmissionOwner(context.username, idea.submittedBy);
  const modError = await requireMod();
  const isMod = modError === undefined;
  if (!isOwner && !isMod) return modError || { error: "Not authorized", status: 403 };

  if (isOwner) {
    await redis.hDel("meetit:pitched_ideas", [ideaId]);
    const msg = `[DISMISS] Idea ${ideaId} hard-deleted by owner u/${context.username}`;
    console.log(msg);
    serverLog("info", msg);
    return { type: "dismiss-idea", success: true };
  }

  // Mod path: require reason, soft-save.
  const reasonError = validateDismissReason(reason);
  if (reasonError) return { error: reasonError, status: 400 };
  const trimmed = (reason as string).trim();
  const dismissedIdea = {
    ...idea,
    status: "dismissed",
    dismissReason: trimmed,
    dismissedAt: new Date().toISOString(),
    dismissedBy: context.username || "unknown",
  };
  await redis.hSet("meetit:pitched_ideas", { [ideaId]: JSON.stringify(dismissedIdea) });
  const msg = `[DISMISS] Idea ${ideaId} soft-dismissed by u/${context.username}: ${trimmed}`;
  console.log(msg);
  serverLog("info", msg);
  return { type: "dismiss-idea", success: true };
}

// pitch-approve: mod approves a pending pitch. Soft-saves with
// status="approved" + approvedAt + approvedBy. Best-effort DM to the pitcher.
// Idempotent: re-approving an already-approved pitch is a no-op (no duplicate
// DM, no re-write). The mod path requires a successful requireMod() check;
// the owner's own pitch cannot be self-approved through this endpoint (the
// owner's delete path is dismissIdea without a reason).
async function onApproveIdea(req: IncomingMessage): Promise<ApiResponse> {
  const authError = await requireMod();
  if (authError) return authError;
  const { ideaId } = await readJSON<{ ideaId: string }>(req);
  if (!ideaId) return { error: "Missing ideaId", status: 400 };
  const ideaJson = await redis.hGet("meetit:pitched_ideas", ideaId);
  if (!ideaJson) {
    const msg = `[APPROVE-IDEA] pitch ${ideaId} not found`;
    console.log(msg);
    serverLog("warn", msg);
    return { error: "Idea not found", status: 404 };
  }
  const idea = safeJSONParse(ideaJson) as Record<string, any> | null;
  if (!idea) {
    const msg = `[APPROVE-IDEA] pitch ${ideaId} not found (malformed JSON)`;
    console.log(msg);
    serverLog("warn", msg);
    return { error: "Idea not found", status: 404 };
  }
  // pitch-approve: idempotency guard. Re-approving an already-approved pitch
  // is a no-op — prevents a double-click (or two mods clicking at the same
  // time) from spamming the pitcher with duplicate DMs.
  if (idea.status === "approved") {
    const msg = `[APPROVE-IDEA] ignored: pitch ${ideaId} already has status="approved"`;
    console.log(msg);
    serverLog("info", msg);
    return { type: "approve-idea", success: true };
  }
  const mod = context.username || "unknown";
  const approvedIdea = {
    ...idea,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: mod,
  };
  await redis.hSet("meetit:pitched_ideas", { [ideaId]: JSON.stringify(approvedIdea) });
  // Best-effort DM. Failure does NOT block the approve (the status is
  // already set). The pitcher still sees the "Approved" line in My Stuff
  // even if the DM doesn't arrive.
  const submittedBy = (idea.submittedBy as string) || "anonymous";
  const dm = buildApproveDm({ title: (idea.title as string) || "your idea", submittedBy });
  try {
    await reddit.sendPrivateMessage({
      to: submittedBy,
      subject: dm.subject,
      text: dm.body,
    });
    const okMsg = `[APPROVE-IDEA] Idea ${ideaId} approved by u/${mod}, DM sent to u/${submittedBy}`;
    console.log(okMsg);
    serverLog("info", okMsg);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const failMsg = `[APPROVE-IDEA] DM failed for u/${submittedBy}: ${errMsg} (status still set to approved)`;
    console.log(failMsg);
    serverLog("warn", failMsg);
  }
  return { type: "approve-idea", success: true };
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
  // FIX-01 (pre-launch-bugs): organizer (event owner) should be able to see
  // contact details, matching onExportAttendees. Fetch event to determine
  // owner. If fetch fails, default to mod-only (the previous behavior).
  let isOwner = false;
  try {
    const eventJson = await redis.hGet("meetit:active_events", eventId);
    if (eventJson) {
      const event = JSON.parse(eventJson) as MeetitEvent;
      isOwner = isSubmissionOwner(context.username, event.organizer);
    }
  } catch (e) { /* owner check is best-effort; default false is safe */ }
  const userIsMod = await isMod();
  const canViewContactDetails = Boolean(includeContactDetails) && (userIsMod || isOwner);
  // FIX-01: log every contact-detail request with the access path so
  // regressions are visible in the in-app debug panel.
  const accessPath = userIsMod ? "mod" : isOwner ? "owner" : "none";
  const fix01Msg = `[FIX-01] rsvp-list eventId=${eventId} requester=${context.username || "anon"} path=${accessPath} count=${results.length} contact=${!!includeContactDetails}`;
  console.log(fix01Msg);
  serverLog("info", fix01Msg);
  if (includeContactDetails && !canViewContactDetails) {
    const warnMsg = `[FIX-01-WARN] rsvp-list eventId=${eventId} requester=${context.username || "anon"} contact-stripped path=none`;
    console.warn(warnMsg);
    serverLog("warn", warnMsg);
  }
  // Fetch contact details from companion hash
  const detailsHash = await redis.hGetAll(`meetit:rsvp_details:${eventId}`);
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
    const deniedMsg = `[H1-PRIVACY] [SERVER-LOGS] DENIED access to /api/server-logs for non-mod u/${user}`;
    console.warn(deniedMsg);
    serverLog("warn", deniedMsg);
    return authError;
  }
  try {
    const results = await redis.zRange("meetit:server_logs", "-inf", "+inf", { by: "score" });
    const logs = results.map((r) => safeJSONParse(r.member)).filter((l): l is { ts: number; level: string; msg: string } => l !== null);
    const okMsg = `[H1-PRIVACY] [SERVER-LOGS] Returning ${logs.length} entries to mod u/${context.username}`;
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

// aged-cleanup-mode: hard-deletes events and pitches older than the
// configured `cleanup_after_days` threshold. Triggered by both the daily
// auto CRON (03:00 UTC) and the mod-only manual endpoint. Uses a separate
// distributed lock (meetit:cleanup_lock, 5-min TTL) so it doesn't conflict
// with the check-events CRON. Best-effort and logged in full.
async function onCleanupAged(req: IncomingMessage): Promise<ApiResponse | TaskResponse> {
  const startedAt = Date.now();
  const isCron = req.url === InternalEndpoint.CheckCleanupAged;
  // 1. Lock check (CRON only)
  if (isCron) {
    const got = await redis.hSetNX("meetit:cleanup_lock", "lock", Date.now().toString());
    if (!got) {
      console.log(`[CLEANUP] auto CRON skipped: lock held by another instance`);
      return { status: "ok", skipped: true };
    }
    await redis.expire("meetit:cleanup_lock", 300); // 5-min TTL
  } else {
    // 2. Auth check (manual only)
    const authError = await requireMod();
    if (authError) return authError;
  }
  // 3. Read settings
  const appSettings = await getSettings();
  const days = appSettings.cleanup_after_days;
  // 4. Threshold validation
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    const msg = `[CLEANUP] invalid threshold=${days}, must be 1-365`;
    console.log(msg);
    serverLog("warn", msg);
    return { error: "Invalid threshold", status: 400 };
  }
  // 5. Pause check (CRON only)
  if (isCron && appSettings.pause_cleanup) {
    const msg = `[CLEANUP] skipped: pause_cleanup=true`;
    console.log(msg);
    serverLog("info", msg);
    return { status: "ok", skipped: true };
  }
  // 6. Log start
  const actor = context.username || "system";
  const startMsg = isCron
    ? `[CLEANUP] auto CRON tick (threshold=${days}d, pause=${appSettings.pause_cleanup})`
    : `[CLEANUP] manual trigger by u/${actor} (threshold=${days}d, pause=${appSettings.pause_cleanup})`;
  console.log(startMsg);
  serverLog("info", startMsg);
  // 7. Read data
  const [activeJson, pendingJson, pitchesJson] = await Promise.all([
    redis.hGetAll("meetit:active_events"),
    redis.hGetAll("meetit:pending_events"),
    redis.hGetAll("meetit:pitched_ideas"),
  ]);
  const activeList = Object.values(activeJson).map((v) => safeJSONParse(v)).filter((e): e is any => e !== null);
  const pendingList = Object.values(pendingJson).map((v) => safeJSONParse(v)).filter((e): e is any => e !== null);
  const pitchList = Object.values(pitchesJson).map((v) => safeJSONParse(v)).filter((p): p is any => p !== null);
  // 8. Pick aged items
  const now = new Date();
  const picked = pickAgedItems(activeList, pendingList, pitchList, now, days, appSettings.timezone);
  // 8a. Log defensive skips (events with missing/invalid date)
  for (const e of activeList) {
    if (!isEventAgedOut(e, now, days, appSettings.timezone) && (typeof e?.date !== "string" || typeof e?.time !== "string" || isNaN(new Date(`${e.date}T${e.time}:00${appSettings.timezone}`).getTime()))) {
      const msg = `[CLEANUP] skipping event ${e?.id}: missing/invalid date (date="${e?.date}" time="${e?.time}")`;
      console.log(msg);
      serverLog("warn", msg);
    }
  }
  for (const e of pendingList) {
    if (!isEventAgedOut(e, now, days, appSettings.timezone) && (typeof e?.date !== "string" || typeof e?.time !== "string" || isNaN(new Date(`${e.date}T${e.time}:00${appSettings.timezone}`).getTime()))) {
      const msg = `[CLEANUP] skipping event ${e?.id}: missing/invalid date (date="${e?.date}" time="${e?.time}")`;
      console.log(msg);
      serverLog("warn", msg);
    }
  }
  for (const p of pitchList) {
    if (!isPitchAgedOut(p, now, days) && (typeof p?.submittedAt !== "string" || isNaN(new Date(p.submittedAt).getTime()))) {
      const msg = `[CLEANUP] skipping pitch ${p?.id}: missing submittedAt`;
      console.log(msg);
      serverLog("warn", msg);
    }
  }
  // 9. Delete aged active events (+ RSVP side data)
  for (const e of picked.agedActiveEvents) {
    if (!e?.id) continue;
    await Promise.all([
      redis.hDel("meetit:active_events", [e.id]),
      redis.del(`meetit:rsvps:${e.id}`),
      redis.del(`meetit:rsvp_details:${e.id}`),
    ]);
  }
  // 10. Delete aged pending events
  if (picked.agedPendingEvents.length > 0) {
    const ids = picked.agedPendingEvents.map((e: any) => e.id).filter(Boolean);
    if (ids.length > 0) await redis.hDel("meetit:pending_events", ids);
  }
  // 11. Delete aged pitches (any status)
  if (picked.agedPitches.length > 0) {
    const ids = picked.agedPitches.map((p: any) => p.id).filter(Boolean);
    if (ids.length > 0) await redis.hDel("meetit:pitched_ideas", ids);
  }
  // 12. Write audit log
  const counts = {
    eventsActive: picked.agedActiveEvents.length,
    eventsPending: picked.agedPendingEvents.length,
    pitches: picked.agedPitches.length,
  };
  const logEntry = buildCleanupLogEntry(now, counts, {
    thresholdDays: days,
    trigger: isCron ? "cron" : "manual",
    user: isCron ? "system" : actor,
  });
  await redis.zAdd("meetit:cleanup_log", { score: now.getTime(), member: logEntry });
  // Trim audit log to 50 most recent entries
  await redis.zRemRangeByRank("meetit:cleanup_log", 0, -51);
  // 13. Log finish
  const took = Date.now() - startedAt;
  const totalDeleted = counts.eventsActive + counts.eventsPending + counts.pitches;
  const finishMsg = totalDeleted === 0
    ? `[CLEANUP] done: nothing to clean (events=${activeList.length + pendingList.length} pitches=${pitchList.length})`
    : `[CLEANUP] done: events active=${counts.eventsActive} pending=${counts.eventsPending}, pitches=${counts.pitches} (threshold=${days}d, took=${took}ms)`;
  console.log(finishMsg);
  serverLog("info", finishMsg);
  if (isCron) return { status: "ok", ...counts };
  return { type: "cleanup-aged", ...counts };
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
    // e30: Second reminder window (default 2 hours). Mods can set to 0 to disable.
    // The dedup key is per-window so both windows can fire in the same CRON run
    // (e.g., for a last-minute event where neither window has fired yet).
    const reminderHours2 = Number(await settings.get("reminder_hours_2")) || 0;
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

    // e30: Two reminder windows — 24h (🔔) and 2h (⏰). Each window has its own
    // dedup key so both can fire in the same CRON run for last-minute events.
    // Mods disable the 2h window by setting reminder_hours_2 to 0.
    // Built ONCE per CRON run (outside the per-event loop) so the active-windows
    // log fires once, not once per event.
    const windows: { hours: number; key: string; prefix: string }[] = [
      { hours: reminderHours, key: "24h", prefix: "🔔 Event Reminder:" },
    ];
    if (reminderHours2 > 0) {
      windows.push({ hours: reminderHours2, key: "2h", prefix: "⏰ Starting Soon:" });
    }
    // e30 logging: log the active windows once per CRON run so it's easy to
    // verify in devvit-cli logs whether the 2h window is enabled (e.g., when
    // debugging "why didn't the 2h reminder fire?" — check this log first).
    const windowsLogMsg = `[CRON] active windows: ${windows.map(function(w) { return w.key + "(" + w.hours + "h)"; }).join(", ")}`;
    console.log(windowsLogMsg);
    serverLog("info", windowsLogMsg);

    for (const [eventId, eventJson] of Object.entries(allEvents)) {
      const event = JSON.parse(eventJson);
      // Parse date+time together for accurate reminder timing using configured timezone
      const eventDateTime = new Date(event.date + "T" + (event.time || "00:00") + ":00" + tzOffset);
      const eventTs = eventDateTime.getTime();
      const nowTs = Date.now();
      const hoursUntilEvent = (eventTs - nowTs) / 3600000;

    for (const win of windows) {
      // Retry window: also allow posts up to 1h after event start (was: skip past events).
      // This covers CRON downtime — a missed reminder still fires once the next tick runs.
      if (hoursUntilEvent > win.hours || hoursUntilEvent < -1) {
        // e30 logging: log skipped events with the reason so it's possible to
        // tell from logs why a particular event didn't get a reminder in this window.
        const skipLogMsg = `[CRON] (${win.key}) skipping ${event.title} hoursUntilEvent=${hoursUntilEvent.toFixed(2)} not in [-1, ${win.hours}]`;
        console.log(skipLogMsg);
        serverLog("info", skipLogMsg);
        continue;
      }
      const remindedKey = `meetit:reminded:${eventId}:${win.key}`;
      if (await redis.get(remindedKey)) {
        // e30 logging: log dedup hits so it's visible when a window is "done" for an event.
        const dedupLogMsg = `[CRON] (${win.key}) already sent for ${event.title} (dedup key set)`;
        console.log(dedupLogMsg);
        serverLog("info", dedupLogMsg);
        continue;
      }
        // e28.9: Log the attendees count included in this reminder body so we can
        // verify the "N going" section was built. 0 = section omitted.
        const reminderAttendees = attendeesByEvent[event.id] || [];
        const reminderLogMsg = `[CRON] Reminder (${win.key}) post for ${event.title} attendees=${reminderAttendees.length} (cap=20)`;
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
            title: buildReminderTitle(event, win.prefix),
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
          const successMsg = `[CRON] Reminder (${win.key}) post sent for ${event.title} (postId=${post?.id ?? "unknown"})`;
          console.log(successMsg);
          serverLog("info", successMsg);
        } catch (e) {
          const errMsg = `[CRON] Post failed for ${event.title} (${win.key}): ${e instanceof Error ? e.message : e}`;
          console.error(errMsg);
          serverLog("error", errMsg);
        }
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
