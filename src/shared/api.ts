export type MeetitEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer?: string;
  mapUrl?: string;
  submittedAt?: string;
  emoji?: string;
  category?: string;
};

export type HomeState = {
  eventsByDate: Record<string, MeetitEvent[]>;
  isMod: boolean;
  settings: AppSettings;
  shareUrl?: string;
};

export type EventDetails = {
  event: MeetitEvent;
  rsvpCount: number;
  hasRsvped: boolean;
  settings: AppSettings;
};

export type PendingEvent = MeetitEvent;

export type AppSettings = {
  primary_color: string;
  secondary_color: string;
  use_brutalist_borders: boolean;
  timezone: string;
};

export type RsvpFormData = {
  email: string;
  phone: string;
};

export type PitchFormData = {
  title: string;
  description: string;
  proposedDate?: string;  // YYYY-MM-DD, optional suggestion from the pitcher
  proposedTime?: string;  // HH:MM, optional
};

export type SubmitEventFormData = {
  title: string;
  organizer?: string;
  date: string;
  time: string;
  location: string;
  desc: string;
  mapUrl?: string;
  category?: string;
};

export type RsvpAttendee = {
  username: string;
  timestamp: number;
  email?: string;
  phone?: string;
};

export const ApiEndpoint = {
  Init: "/api/init",
  Home: "/api/home",
  EventDetails: "/api/event-details",
  Rsvp: "/api/rsvp",
  LeaveEvent: "/api/leave-event",
  RsvpList: "/api/rsvp-list",
  PitchIdea: "/api/pitch-idea",
  SubmitEvent: "/api/submit-event",
  ApproveEvent: "/api/approve-event",
  PendingEvents: "/api/pending-events",
  PitchedIdeas: "/api/pitched-ideas",
  AllApprovedEvents: "/api/all-approved-events",
  DismissIdea: "/api/dismiss-idea",
  DeletePending: "/api/delete-pending",
  DeletePublished: "/api/delete-published",
  MySubmissions: "/api/my-submissions",
  MyRsvp: "/api/my-rsvp",
  ExportAttendees: "/api/export-attendees",
  ServerLogs: "/api/server-logs",
  RsvpShare: "/api/rsvp-share",
} as const;

export type ApiEndpoint = (typeof ApiEndpoint)[keyof typeof ApiEndpoint];

export const EventCategories = [
  { id: "social", label: "Social", emoji: "🎉", color: "#ff69b4" },
  { id: "tech", label: "Tech", emoji: "💻", color: "#6366f1" },
  { id: "sports", label: "Sports", emoji: "🏃", color: "#22c55e" },
  { id: "food", label: "Food", emoji: "🍕", color: "#f97316" },
  { id: "arts", label: "Arts", emoji: "🎨", color: "#a855f7" },
  { id: "outdoors", label: "Outdoors", emoji: "🌿", color: "#10b981" },
  { id: "gaming", label: "Gaming", emoji: "🎮", color: "#3b82f6" },
  { id: "music", label: "Music", emoji: "🎵", color: "#ec4899" },
  { id: "wellness", label: "Wellness", emoji: "🧘", color: "#14b8a6" },
  { id: "education", label: "Education", emoji: "📚", color: "#f59e0b" },
  { id: "networking", label: "Networking", emoji: "🤝", color: "#8b5cf6" },
  { id: "other", label: "Other", emoji: "⭐", color: "#6b7280" },
] as const;
