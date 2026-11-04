-- Lets the sign-in form rate limit codes by IP as well as by email. Re-run after a fresh `load-db --force`.
ALTER TABLE "otp_codes" ADD COLUMN IF NOT EXISTS "ip_address" varchar(45) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS "otp_codes_idx_email_created" ON "otp_codes" ("email", "created_at");
