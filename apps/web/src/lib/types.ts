export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Server-side pagination envelope (e.g. GET /events).
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Options for the events page filter dropdowns (GET /events/facets).
export interface EventFacets {
  eventTypes: string[];
  applications: { name: string; slug: string }[];
}

export interface SecurityEvent {
  id: string;
  applicationId: string;
  application?: { name: string; slug: string } | null;
  eventType: string;
  severity: Severity;
  userId: string | null;
  email: string | null;
  ipAddress: string | null;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  userAgent: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
  createdAt: string;
}

export type AlertDisposition =
  | 'BENIGN'
  | 'FALSE_POSITIVE'
  | 'TRUE_POSITIVE_NO_IMPACT'
  | 'TRUE_POSITIVE';

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: string;
  disposition: AlertDisposition | null;
  description: string | null;
  ruleId: string | null;
  eventId: string | null;
  incidentId: string | null;
  createdAt: string;
}

export interface AlertComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

// Returned by GET /alerts/:id — includes the triggering event + any incident.
export interface AlertDetail extends Alert {
  event:
    | (SecurityEvent & { metadata?: Record<string, unknown> | null })
    | null;
  incident: Incident | null;
  comments: AlertComment[];
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: Severity;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  name: string;
  slug: string;
  // The full key is never returned by the API — only its display prefix.
  // `apiKey` appears once, in the response to registering a new application.
  keyPrefix: string;
  status: string;
  createdAt: string;
}

export interface Overview {
  totals: {
    events: number;
    events24h: number;
    failedLogins24h: number;
    applications: number;
    incidents: number;
    users: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    criticalOpen: number;
    highOpen: number;
    mediumOpen: number;
  };
  recentAlerts: Alert[];
  eventTypes: { type: string; count: number }[];
  logSources: { hours: string[]; series: { name: string; data: number[] }[] };
  geo: { country: string; count: number; lat?: number; lng?: number }[];
}
