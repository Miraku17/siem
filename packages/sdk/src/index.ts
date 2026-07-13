// SIEM client SDK — applications call this instead of hitting the API directly.
//
//   const security = new SiemClient({
//     apiKey: process.env.SIEM_API_KEY!,
//     application: 'velocity-pickleball',
//   });
//   await security.loginSuccess({ userId, ip, userAgent });

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SiemClientOptions {
  apiKey: string;
  application: string;
  baseUrl?: string; // default http://localhost:4000
}

export interface EventContext {
  userId?: string;
  email?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class SiemClient {
  private readonly baseUrl: string;

  constructor(private readonly opts: SiemClientOptions) {
    this.baseUrl = opts.baseUrl ?? 'http://localhost:4000';
  }

  // Low-level send. Fire-and-forget friendly; never throws into the caller path.
  async send(event: string, severity: Severity, ctx: EventContext = {}) {
    try {
      await fetch(`${this.baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({
          application: this.opts.application,
          event,
          severity,
          timestamp: new Date().toISOString(),
          ...ctx,
        }),
      });
    } catch {
      // Swallow — logging must never break the host application.
    }
  }

  // ── Typed helpers (extend as needed) ──────────────────────
  loginSuccess(ctx: EventContext) { return this.send('LOGIN_SUCCESS', 'LOW', ctx); }
  loginFailed(ctx: EventContext) { return this.send('LOGIN_FAILED', 'LOW', ctx); }
  bookingCreated(ctx: EventContext) { return this.send('BOOKING_CREATED', 'LOW', ctx); }
  paymentSuccess(ctx: EventContext) { return this.send('PAYMENT_SUCCESS', 'LOW', ctx); }
  accessDenied(ctx: EventContext) { return this.send('ACCESS_DENIED', 'MEDIUM', ctx); }
}
