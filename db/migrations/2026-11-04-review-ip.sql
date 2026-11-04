-- Lets the review form rate limit by IP. Re-run after a fresh `load-db --force`.
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "ip_address" varchar(45) DEFAULT NULL;
