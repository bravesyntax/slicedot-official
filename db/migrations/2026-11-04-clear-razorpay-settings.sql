-- Razorpay keys belong in environment variables, not in a database table. The app never reads these rows.
-- The dump has them, so re-run this after a fresh `load-db --force`.
UPDATE "settings" SET "setting_value" = '' WHERE "setting_key" IN ('razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret');
