-- info@slicedot.in is the store's public address and sender; bravesyntax@gmail.com is the admin's.
-- The dump has older addresses, so re-run this after a fresh `load-db --force`.
UPDATE "settings" SET "setting_value" = 'info@slicedot.in' WHERE "setting_key" IN ('store_email', 'site_email');
UPDATE "admin_users" SET "email" = 'bravesyntax@gmail.com' WHERE "username" = 'admin';
