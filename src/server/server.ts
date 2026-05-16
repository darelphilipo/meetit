import type { IncomingMessage, ServerResponse } from "node:http";
import { context, reddit, redis, scheduler, settings } from "@devvit/web/server";
import type { PartialJsonValue, UiResponse, TaskRequest, TaskResponse } from "@devvit/web/shared";
import {
  ApiEndpoint,
  type MeetitEvent,
  type HomeState,
  type EventDetails,
  type AppSettings,
  type RsvpFormData,
  type PitchFormData,
  type SubmitEventFormData,
} from "../shared/api.ts";
import { once } from "node:events";

const GOOGLE_SHEETS_WEBHOOK_URL = ""; // Set to your Zapier/Google Sheets webhook URL

const DEFAULT_EVENT: MeetitEvent = {
  id: "default-bangalore-tech-chai",
  title: "Bangalore Tech & Chai",
  date: "2026-05-15",
  time: "16:00",
  location: "Cubbon Park, Bangalore",
  description: "Join fellow redditors for an evening of tech talks, networking, and cutting chai. All skill levels welcome!",
  organizer: "u/darelphilip",
  mapUrl: "https://maps.google.com/?q=Cubbon+Park+Bangalore",
};

export async function serverOnRequest(
  req: IncomingMessage,
  rsp: ServerResponse,
): Promise<void> {
  try {
    await onRequest(req, rsp);
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`;
    console.error(msg);
    writeJSON<ErrorResponse>(500, { error: msg, status: 500 }, rsp);
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
  console.log(`[API] ${req.method || "POST"} ${endpoint}`);

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
    case ApiEndpoint.AllEvents:
      body = await onAllEvents();
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
  | { type: "init"; postId: string; username: string; settings: AppSettings }
  | { type: "home"; data: HomeState }
  | { type: "event-details"; data: EventDetails }
  | { type: "rsvp"; success: boolean }
  | { type: "leave-event"; success: boolean }
  | { type: "rsvp-list"; attendees: { username: string; timestamp: number }[] }
  | { type: "pitch-idea"; success: boolean }
  | { type: "submit-event"; success: boolean }
  | { type: "approve-event"; success: boolean }
  | { type: "pending-events"; events: MeetitEvent[] }
  | { type: "pitched-ideas"; ideas: any[] }
  | { type: "all-approved-events"; events: any[] }
  | { type: "dismiss-idea"; success: boolean }
  | { type: "my-submissions"; pitches: any[]; events: MeetitEvent[] };

type ErrorResponse = {
  error: string;
  status: number;
};

async function getSettings(): Promise<AppSettings> {
  try {
    const [primary, secondary, borders] = await Promise.all([
      settings.get("primary_color"),
      settings.get("secondary_color"),
      settings.get("use_brutalist_borders"),
    ]);
    return {
      primary_color: (primary as string) || "#ffff00",
      secondary_color: (secondary as string) || "#ff69b4",
      use_brutalist_borders: (borders as boolean) !== false,
    };
  } catch (e) {
    console.error(`getSettings error: ${e}`);
    return { primary_color: "#ffff00", secondary_color: "#ff69b4", use_brutalist_borders: true };
  }
}

async function isMod(): Promise<boolean> {
  const username = context.username;
  if (!username) return false;
  try {
    const modList = await settings.get("mod_usernames");
    if (modList) {
      const mods = (modList as string).split(",").map(s => s.trim().toLowerCase());
      return mods.includes(username.toLowerCase());
    }
  } catch (e) { console.error(`isMod error: ${e}`); }
  // Fallback: if no mod list configured, allow access (first install)
  return true;
}

async function getActiveEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map((val) => JSON.parse(val));
  return eventList.sort((a, b) => a.date.localeCompare(b.date));
}

async function getPendingEventsList(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:pending_events");
  return Object.values(events).map((val) => JSON.parse(val));
}

async function getRsvpCount(eventId: string): Promise<number> {
  return await redis.zCard(`meetit:rsvps:${eventId}`);
}

async function isUserRsvped(eventId: string, username: string): Promise<boolean> {
  const score = await redis.zScore(`meetit:rsvps:${eventId}`, username);
  return score != null; // catches both null and undefined
}

async function addRsvp(eventId: string, username: string, email: string, phone: string): Promise<void> {
  const key = `meetit:rsvps:${eventId}`;
  await redis.zAdd(key, { score: Date.now(), member: username });
  if (email || phone) {
    await redis.hSet(`meetit:rsvp_details:${eventId}`, { [username]: JSON.stringify({ email: email || "", phone: phone || "" }) });
  }
  const verifyScore = await redis.zScore(key, username);
  console.log(`[RSVP] ${username} → ${eventId} | score=${verifyScore} | email=${!!email} phone=${!!phone}`);
}

async function getRsvpList(eventId: string): Promise<string[]> {
  const results = await redis.zRange(
    `meetit:rsvps:${eventId}`,
    "-inf",
    "+inf",
    { by: "score" },
  );
  return results.map((r) => r.member);
}

async function onInit(): Promise<ApiResponse> {
  const appSettings = await getSettings();
  return {
    type: "init",
    postId: context.postId || "",
    username: context.username || "user",
    settings: appSettings,
  };
}

async function onHome(): Promise<ApiResponse> {
  console.log(`[HOME] Loading events for user ${context.username}`);
  const events = await getActiveEvents();
  const modStatus = await isMod();
  console.log(`[HOME] Found ${events.length} events, isMod=${modStatus}`);
  const appSettings = await getSettings();

  const eventsByDate: Record<string, MeetitEvent[]> = {};
  for (const event of events) {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  }

  return {
    type: "home",
    data: {
      eventsByDate,
      isMod: modStatus,
      settings: appSettings,
    },
  };
}

async function onEventDetails(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  const events = await getActiveEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return { error: "Event not found", status: 404 };
  }

  const username = context.username || "";
  const rsvpCount = await getRsvpCount(eventId);
  const hasRsvped = await isUserRsvped(eventId, username);
  const appSettings = await getSettings();

  return {
    type: "event-details",
    data: { event, rsvpCount, hasRsvped, settings: appSettings },
  };
}

async function onRsvp(req: IncomingMessage): Promise<ApiResponse> {
  const { email, phone, eventId } = await readJSON<{ eventId: string } & RsvpFormData>(req);
  const username = context.username || "";
  console.log(`[RSVP] ${username} → ${eventId} (email=${email ? "yes" : "no"}, phone=${phone ? "yes" : "no"})`);
  await addRsvp(eventId, username, email || "", phone || "");

  if (GOOGLE_SHEETS_WEBHOOK_URL) {
    try {
      await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: email || "", phone: phone || "", event_id: eventId }),
      });
    } catch (e) { console.log(`Webhook send failed (ignored): ${e}`); }
  }

  return { type: "rsvp", success: true };
}

async function onPitchIdea(req: IncomingMessage): Promise<ApiResponse> {
  const { title, description } = await readJSON<PitchFormData>(req);
  const username = context.username || "unknown";
  console.log(`[PITCH] "${title}" by u/${username}`);

  const ideaId = `idea_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idea = { id: ideaId, title, description, submittedBy: username, submittedAt: new Date().toISOString() };
  await redis.hSet("meetit:pitched_ideas", { [ideaId]: JSON.stringify(idea) });

  // Notification comment disabled - submitComment not available in Devvit Web
  // await notifyMods(`💡 New pitch idea...`);
  return { type: "pitch-idea", success: true };
}

// Helper: post notification comment on the app post
async function notifyMods(message: string): Promise<void> {
  const postId = context.postId;
  console.log(`[NOTIFY] postId=${postId}, msgLen=${message?.length}`);
  if (!postId) { console.log("[NOTIFY] No postId"); return; }
  try {
    await reddit.submitComment({ postId: postId.startsWith("t3_") ? postId : "t3_" + postId, text: message, runAs: "APP" });
    console.log("[NOTIFY] Comment posted");
  } catch (e) {
    console.error(`[NOTIFY] Failed: ${e}`);
  }
}

async function onSendEventAnnouncement(req: IncomingMessage): Promise<TaskResponse> {
  console.log(`[SCHEDULER] send_event_announcement FIRED at ${new Date().toISOString()}`);
  try {
    const raw = await readRaw(req);
    console.log(`[SCHEDULER] Announce raw body: ${raw.substring(0, 200)}`);
    const body = await readJSON<TaskRequest<{ eventTitle: string; eventDate: string; eventTime: string; eventLocation: string; eventDescription: string }>>(req);
    const d = body.data;
    if (!d) return { status: "ok" };
    const postId = context.postId;
    if (!postId) { console.log("No postId for announcement comment"); return { status: "ok" }; }
    await reddit.submitComment({
      postId: postId.startsWith("t3_") ? postId : "t3_" + postId,
      text: `📢 **Event Reminder: ${d.eventTitle}**\n\n📅 ${d.eventDate}\n⏰ ${d.eventTime}\n📍 ${d.eventLocation}\n\n${d.eventDescription}\n\nRSVP on the app! 🎉`,
    });
    console.log(`Announcement comment posted for ${d.eventTitle}`);
    return { status: "ok" };
  } catch (e) {
    console.error(`Announcement error: ${e}`);
    return { status: "error", message: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function onSubmitEvent(req: IncomingMessage): Promise<ApiResponse> {
  const formData = await readJSON<SubmitEventFormData>(req);
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const event: MeetitEvent = {
    id: eventId,
    title: formData.title,
    date: formData.date,
    time: formData.time,
    location: formData.location,
    description: formData.desc,
    organizer: formData.organizer,
    mapUrl: formData.mapUrl,
  };

  await redis.hSet("meetit:pending_events", { [eventId]: JSON.stringify(event) });
  const saved = !!(await redis.hGet("meetit:pending_events", eventId));
  console.log(`[SUBMIT] "${event.title}" by ${context.username} | saved=${saved} | id=${eventId}`);
  return { type: "submit-event", success: saved };
}

async function onApproveEvent(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  const eventJson = await redis.hGet("meetit:pending_events", eventId);

  if (eventJson) {
    await redis.hSet("meetit:active_events", { [eventId]: eventJson });
    await redis.hDel("meetit:pending_events", [eventId]);
    // Verify the move
    const inActive = !!(await redis.hGet("meetit:active_events", eventId));
    const inPending = !!(await redis.hGet("meetit:pending_events", eventId));
    const event = JSON.parse(eventJson) as MeetitEvent;
    console.log(`[APPROVE] ${event.title} | active=${inActive} pending=${inPending}${inPending ? " ⚠️ STILL IN PENDING!" : " ✅"}`);
  }

  return { type: "approve-event", success: true };
}

async function onPendingEvents(): Promise<ApiResponse> {
  const events = await getPendingEventsList();
  return { type: "pending-events", events };
}

async function onPitchedIdeas(): Promise<ApiResponse> {
  const ideas = await redis.hGetAll("meetit:pitched_ideas");
  const ideasList = Object.values(ideas).map((val) => JSON.parse(val));
  return { type: "pitched-ideas", ideas: ideasList };
}

async function onAllApprovedEvents(): Promise<ApiResponse> {
  const events = await getActiveEvents();
  // Filter out hardcoded default event
  const realEvents = events.filter(e => e.id !== "default-bangalore-tech-chai");
  const eventsWithCounts = await Promise.all(
    realEvents.map(async (event) => {
      const count = await getRsvpCount(event.id);
      return { ...event, rsvpCount: count };
    })
  );
  return { type: "all-approved-events", events: eventsWithCounts };
}

async function onDismissIdea(req: IncomingMessage): Promise<ApiResponse> {
  const { ideaId } = await readJSON<{ ideaId: string }>(req);
  await redis.hDel("meetit:pitched_ideas", [ideaId]);
  const ok = !(await redis.hGet("meetit:pitched_ideas", ideaId));
  console.log(`[DISMISS] Idea ${ideaId} removed: ${ok}`);
  return { type: "dismiss-idea", success: ok };
}

async function onDeletePending(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  await redis.hDel("meetit:pending_events", [eventId]);
  const ok = !(await redis.hGet("meetit:pending_events", eventId));
  console.log(`[DEL-PEND] ${eventId} | removed=${ok}${!ok ? " ⚠️ FAILED!" : ""}`);
  return { type: "dismiss-idea", success: ok };
}

async function onDeletePublished(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  await redis.hDel("meetit:active_events", [eventId]);
  const ok = !(await redis.hGet("meetit:active_events", eventId));
  console.log(`[DEL-PUB] ${eventId} | removed=${ok}${!ok ? " ⚠️ FAILED!" : ""}`);
  return { type: "dismiss-idea", success: ok };
}

async function onLeaveEvent(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  const username = context.username || "";
  const key = `meetit:rsvps:${eventId}`;
  console.log(`[LEAVE] Removing ${username} from ${key}`);

  // zRem with array is what works (write-behind, eventually consistent)
  await redis.zRem(key, [username]);

  // Don't verify immediately - Redis in Devvit is eventually consistent
  // The next event-details fetch will show the correct state
  return { type: "leave-event", success: true };
}

async function onRsvpList(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  const results = await redis.zRange(`meetit:rsvps:${eventId}`, "-inf", "+inf", { by: "score" });
  // Fetch contact details from companion hash
  const detailsHash = await redis.hGetAll(`meetit:rsvp_details:${eventId}`);
  const attendees = results.map((r) => {
    const details = detailsHash[r.member] ? JSON.parse(detailsHash[r.member]) : { email: "", phone: "" };
    return { username: r.member, timestamp: r.score, email: details.email || "", phone: details.phone || "" };
  });
  return { type: "rsvp-list", attendees };
}

async function onMySubmissions(): Promise<ApiResponse> {
  const username = context.username || "";
  const pitchesJson = await redis.hGetAll("meetit:pitched_ideas");
  const pitches = Object.values(pitchesJson)
    .map((val) => JSON.parse(val))
    .filter((idea: any) => idea.submittedBy === username);

  // Check pending
  const pendingJson = await redis.hGetAll("meetit:pending_events");
  const pendingEvents = Object.values(pendingJson)
    .map((val) => JSON.parse(val))
    .filter((event: MeetitEvent) => event.organizer === `u/${username}`)
    .map(e => ({ ...e, status: "pending" }));

  // Check active
  const activeJson = await redis.hGetAll("meetit:active_events");
  const activeEvents = Object.values(activeJson)
    .map((val) => JSON.parse(val))
    .filter((event: MeetitEvent) => event.organizer === `u/${username}`)
    .map(e => ({ ...e, status: "published" }));

  const myEvents = [...pendingEvents, ...activeEvents];
  return { type: "my-submissions", pitches, events: myEvents };
}

async function onSendReminders(req: IncomingMessage): Promise<TaskResponse> {
  console.log(`[SCHEDULER] send_24hr_reminders FIRED at ${new Date().toISOString()}`);
  try {
    const raw = await readRaw(req);
    console.log(`[SCHEDULER] Reminder raw body: ${raw.substring(0, 200)}`);
    const body = await readJSON<TaskRequest<{ eventId: string }>>(req);
    const eventId = body.data?.eventId;
    if (!eventId) {
      console.log("No eventId provided to reminder job");
      return { status: "error", message: "No eventId provided" };
    }

    const attendees = await getRsvpList(eventId);
    for (const username of attendees) {
      try {
        await reddit.sendPrivateMessage({
          subject: "Meetit: Your meetup is tomorrow!",
          body: `Hey u/${username}! Just a reminder that the meetup you RSVP'd for is happening in 24 hours. See you there!`,
          to: username,
        });
      } catch (e) {
        console.log(`Failed to send reminder to ${username}: ${e}`);
      }
    }

    return { status: "ok" };
  } catch (error) {
    console.error("Error in send_24hr_reminders:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function onMenuCreatePost(): Promise<UiResponse> {
  try {
    const post = await reddit.submitCustomPost({
      title: "Meetit - Community Meetups",
    });
    return {
      showToast: { text: `Meetit post created!`, appearance: "success" },
      navigateTo: post.url,
    };
  } catch (e) {
    console.error(`Failed to create post: ${e}`);
    return {
      showToast: { text: `Failed to create post: ${e}`, appearance: "error" },
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
  console.log(`[CRON] check-events FIRED at ${new Date().toISOString()}`);
  try {
    const allEvents = await redis.hGetAll("meetit:active_events");
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);

    // === 1. Reminder posts for upcoming events ===
    for (const [eventId, eventJson] of Object.entries(allEvents)) {
      const event = JSON.parse(eventJson);
      const eventDate = new Date(event.date + "T00:00:00Z");
      if (eventDate.getTime() > tomorrow.getTime() || eventDate.getTime() < now.getTime()) continue;
      const remindedKey = `meetit:reminded:${eventId}`;
      if (await redis.get(remindedKey)) continue;
      console.log(`[CRON] Reminder post for ${event.title}`);
      try {
        await reddit.submitCustomPost({ title: `📢 Event Reminder: ${event.title} is happening ${event.date}!`, userGeneratedContent: { text: `# ${event.title}\n\n## 🗓️ ${event.date} at ${event.time}\n\n## 📍 ${event.location}\n\n${event.description}\n\n---\n\n**Organized by:** ${event.organizer || "the community"}\n\nSearch 'Meetit' in this subreddit to join!` } });
      } catch (e) { console.error(`[CRON] Post failed: ${e}`); }
      await redis.set(remindedKey, "true");
      await redis.expire(remindedKey, 86400);
    }

    // === 2. Mod alerts for new pending items ===
    const pendingKey = "meetit:last_alert_check";
    const lastCheck = await redis.get(pendingKey) || "0";
    const nowTs = Date.now().toString();
    const pendingEvents = await redis.hGetAll("meetit:pending_events");
    const pitchedIdeas = await redis.hGetAll("meetit:pitched_ideas");
    let newItems = 0;
    for (const [, json] of Object.entries({ ...pendingEvents, ...pitchedIdeas })) {
      const item = JSON.parse(json);
      const submittedAt = new Date(item.submittedAt || item.submittedAt || 0).getTime();
      if (submittedAt > parseInt(lastCheck)) newItems++;
    }
    if (newItems > 0) {
      console.log(`[CRON] ${newItems} new items since last check`);
      // Attempt to notify via message to subreddit
      try {
        await reddit.sendPrivateMessage({ subject: `Meetit: ${newItems} new item(s) await review`, body: `There are ${newItems} new pending event(s) or pitch(es) to review.\n\nOpen the Meetit app in r/${context.subredditName} to manage them.`, to: `/r/${context.subredditName}` });
        console.log(`[CRON] Mod alert sent`);
      } catch (e) { console.log(`[CRON] Mod alert failed (may not be supported): ${e}`); }
      // Also try creating an alert post as fallback
      try {
        await reddit.submitCustomPost({ title: `🔔 Meetit: ${newItems} new item(s) need review`, userGeneratedContent: { text: `Open the Meetit app to review ${newItems} new pending event(s) or pitch(es).` } });
      } catch (e2) { console.log(`[CRON] Alert post failed: ${e2}`); }
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
  return JSON.parse(raw);
}
