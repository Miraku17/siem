-- Index for the paginated event list (ORDER BY timestamp DESC with no filter).
CREATE INDEX "security_events_timestamp_idx" ON "security_events"("timestamp");
