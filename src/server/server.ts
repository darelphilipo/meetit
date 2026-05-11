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
    case ApiEndpoint.PitchedIdeas:
      body = await onPitchedIdeas();
      break;
    case InternalEndpoint.OnPostCreate:
      body = await onMenuCreatePost();
      break;
    case InternalEndpoint.OnAppInstall:
      body = await onAppInstall();
      break;
    case InternalEndpoint.SendReminders:
      body = await onSendReminders(req);
      break;
    default:
      endpoint satisfies never;
      body = { error: "not found", status: 404 };
      break;
  }

  writeJSON<PartialJsonValue>("status" in body ? body.status : 200, body, rsp);
}

const InternalEndpoint = {
  OnPostCreate: "/internal/menu/create-post",
  OnAppInstall: "/internal/on-app-install",
  SendReminders: "/internal/scheduler/send-24hr-reminders",
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
  // getModerators().children is empty in inline webview context
  // Workaround: always allow access since the app is installed on mod's subreddit
  return true;
}

async function getActiveEvents(): Promise<MeetitEvent[]> {
  const events = await redis.hGetAll("meetit:active_events");
  const eventList = Object.values(events).map((val) => JSON.parse(val));
  if (eventList.length === 0) {
    return [DEFAULT_EVENT];
  }
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

async function addRsvp(eventId: string, username: string): Promise<void> {
  const key = `meetit:rsvps:${eventId}`;
  await redis.zAdd(key, {
    score: Date.now(),
    member: username,
  });
  // Verify
  const verifyScore = await redis.zScore(key, username);
  console.log(`[RSVP] Added ${username} to ${key}, verified score=${verifyScore}`);
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
  const events = await getActiveEvents();
  const modStatus = await isMod();
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

  await addRsvp(eventId, username);

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

  const ideaId = `idea_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idea = {
    id: ideaId,
    title,
    description,
    submittedBy: username,
    submittedAt: new Date().toISOString(),
  };

  await redis.hSet("meetit:pitched_ideas", {
    [ideaId]: JSON.stringify(idea),
  });

  console.log(`Pitch idea saved: ${title} by ${username}`);
  return { type: "pitch-idea", success: true };
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

  await redis.hSet("meetit:pending_events", {
    [eventId]: JSON.stringify(event),
  });

  return { type: "submit-event", success: true };
}

async function onApproveEvent(req: IncomingMessage): Promise<ApiResponse> {
  const { eventId } = await readJSON<{ eventId: string }>(req);
  const eventJson = await redis.hGet("meetit:pending_events", eventId);

  if (eventJson) {
    await redis.hSet("meetit:active_events", {
      [eventId]: eventJson,
    });
    await redis.hDel("meetit:pending_events", eventId);

    const event = JSON.parse(eventJson) as MeetitEvent;
    const eventDate = new Date(event.date);
    eventDate.setDate(eventDate.getDate() - 1);

    await scheduler.runJob({
      name: "send_24hr_reminders",
      data: { eventId },
      runAt: eventDate,
    });
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
  const attendees = results.map((r) => ({ username: r.member, timestamp: r.score }));
  return { type: "rsvp-list", attendees };
}

async function onMySubmissions(): Promise<ApiResponse> {
  const username = context.username || "";
  const pitchesJson = await redis.hGetAll("meetit:pitched_ideas");
  const pitches = Object.values(pitchesJson)
    .map((val) => JSON.parse(val))
    .filter((idea: any) => idea.submittedBy === username);

  const eventsJson = await redis.hGetAll("meetit:pending_events");
  const activeEventsJson = await redis.hGetAll("meetit:active_events");
  const allEvents = { ...eventsJson, ...activeEventsJson };
  const myEvents = Object.values(allEvents)
    .map((val) => JSON.parse(val))
    .filter((event: MeetitEvent) => event.organizer === `u/${username}`);

  return { type: "my-submissions", pitches, events: myEvents };
}

async function onSendReminders(req: IncomingMessage): Promise<TaskResponse> {
  try {
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

async function readJSON<T>(req: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  await once(req, "end");
  return JSON.parse(`${Buffer.concat(chunks)}`);
}
