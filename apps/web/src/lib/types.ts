export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: string;
  description: string | null;
  ruleId: string | null;
  eventId: string | null;
  incidentId: string | null;
  createdAt: string;
}

// Returned by GET /alerts/:id — includes the triggering event + any incident.
export interface AlertDetail extends Alert {
  event:
    | (SecurityEvent & { metadata?: Record<string, unknown> | null })
    | null;
  incident: Incident | null;
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
  apiKey: string;
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
