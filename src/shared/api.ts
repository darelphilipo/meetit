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
};

export type RsvpFormData = {
  email: string;
  phone: string;
};

export type PitchFormData = {
  title: string;
  description: string;
};

export type SubmitEventFormData = {
  title: string;
  organizer?: string;
  date: string;
  time: string;
  location: string;
  desc: string;
  mapUrl?: string;
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
} as const;

export type ApiEndpoint = (typeof ApiEndpoint)[keyof typeof ApiEndpoint];
