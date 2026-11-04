-- Replaces the imported keyword list with terms that lead somewhere. None of the 4,992 old tags returned a product in the
-- store's search, and 10 clicks were all they ever got. Re-run after a load-db --force. Add new ones in Admin → SEO → Keywords.

DELETE FROM seo_tags;

INSERT INTO seo_tags (tag_name, tag_slug, category_group, is_global, status) VALUES
  ('hair claw clip', 'hair-claw-clip', 'hair-accessories', 1, 'active'),
  ('claw clip', 'claw-clip', 'hair-accessories', 1, 'active'),
  ('powder brush', 'powder-brush', 'skincare-beauty', 1, 'active'),
  ('body lotion', 'body-lotion', 'skincare-beauty', 1, 'active'),
  ('eau de parfum', 'eau-de-parfum', 'skincare-beauty', 1, 'active'),
  ('hoodie', 'hoodie', 'fashion-accessories', 1, 'active'),
  ('zip-up hoodie', 'zip-up-hoodie', 'fashion-accessories', 1, 'active'),
  ('back cover', 'back-cover', 'phone-tech', 1, 'active'),
  ('iphone', 'iphone', 'phone-tech', 1, 'active'),
  ('kitchen tool set', 'kitchen-tool-set', 'home-kitchen', 1, 'active');

-- Each product lists only the keywords in its own name.
INSERT INTO product_seo_tags (product_id, tag_id)
SELECT p.id, t.id FROM products p JOIN seo_tags t ON p.name ILIKE '%' || t.tag_name || '%';
