-- Store only a SHA-256 of each application's API key.
--
-- Existing keys are hashed in place rather than reissued, so live integrations
-- (Bedrock) keep working without a redeploy. The plaintext is destroyed by the
-- final DROP COLUMN and cannot be recovered — the dashboard shows `keyPrefix`
-- for identification, and a lost key must be rotated by issuing a new one.

ALTER TABLE "applications" ADD COLUMN "apiKeyHash" TEXT;
ALTER TABLE "applications" ADD COLUMN "keyPrefix" TEXT;

-- sha256() is built into PostgreSQL 11+; no pgcrypto extension required.
UPDATE "applications"
SET "apiKeyHash" = encode(sha256(convert_to("apiKey", 'UTF8')), 'hex'),
    "keyPrefix"  = left("apiKey", 16);

ALTER TABLE "applications" ALTER COLUMN "apiKeyHash" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "keyPrefix" SET NOT NULL;

DROP INDEX IF EXISTS "applications_apiKey_key";
ALTER TABLE "applications" DROP COLUMN "apiKey";

CREATE UNIQUE INDEX "applications_apiKeyHash_key" ON "applications"("apiKeyHash");
