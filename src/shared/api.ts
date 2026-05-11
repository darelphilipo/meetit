export type MeetitEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer?: string;
  mapUrl?: string;
};

export type HomeState = {
  eventsByDate: Record<string, MeetitEvent[]>;
  isMod: boolean;
  settings: AppSettings;
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

export const ApiEndpoint = {
  Init: "/api/init",
  Home: "/api/home",
  EventDetails: "/api/event-details",
  Rsvp: "/api/rsvp",
  PitchIdea: "/api/pitch-idea",
  SubmitEvent: "/api/submit-event",
  ApproveEvent: "/api/approve-event",
  PendingEvents: "/api/pending-events",
  PitchedIdeas: "/api/pitched-ideas",
} as const;

export type ApiEndpoint = (typeof ApiEndpoint)[keyof typeof ApiEndpoint];
