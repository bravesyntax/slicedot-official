-- Typo-tolerant product search with Postgres's built-in pg_trgm extension (free, no outside service).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (lower(name) gin_trgm_ops);
