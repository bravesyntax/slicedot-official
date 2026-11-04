-- info@slicedot.in is the store's public address and sender. The dump has older addresses, so re-run this after a fresh
-- `load-db --force`, along with scripts/set-admin-email.mjs for the admin account.
UPDATE "settings" SET "setting_value" = 'info@slicedot.in' WHERE "setting_key" IN ('store_email', 'site_email');
