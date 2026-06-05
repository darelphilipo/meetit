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
