// Demo catalog for checking the store's design. Every row has product_type 'Demo' and an SKU starting DEMO-, and stays out of search.
//   node --env-file=.env.local scripts/demo-products.mjs images   makes public/uploads/products/demo-*.webp
//   node --env-file=.env.local scripts/demo-products.mjs add      adds the products (safe to run twice)
//   node --env-file=.env.local scripts/demo-products.mjs remove   removes them again, unless one has been ordered
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import postgres from "postgres";
import sharp from "sharp";

const CATEGORY = { jewelry: 2, phone: 8, phoneCases: 16, kitchen: 20, home: 12, perfumes: 13, fashion: 7, hair: 15, lotions: 18, brushes: 19 };

// [name, category, price, compare, stock, featured, icon, pale colour, deep colour, colours, sizes, description]
const PRODUCTS = [
  ["Rose Gold Layered Pendant Necklace", "jewelry", 449, 899, 30, 1, "Gem", "#fde8e4", "#b4534a", "Rose Gold #b76e79|Silver #c0c0c0", "", "A delicate two-layer chain with a polished pendant. Light enough for all-day wear and easy to pair with everyday outfits."],
  ["Kundan Pearl Jhumka Earrings", "jewelry", 599, 1199, 22, 1, "Sparkles", "#fbf1d9", "#a97a15", "Gold #ca8a04", "", "Traditional jhumkas with pearl drops and kundan detailing, made for festive days and weddings."],
  ["Adjustable Crystal Charm Bracelet", "jewelry", 349, 699, 3, 0, "CircleDot", "#e8ecfb", "#4453a6", "Silver #c0c0c0|Gold #ca8a04", "", "A slim adjustable bracelet with crystal charms. Fits most wrists and comes in a gift-ready pouch."],
  ["Noir Oud Eau De Parfum 100ml", "perfumes", 1299, 2499, 18, 1, "FlaskConical", "#e9e4f5", "#57408f", "", "", "A warm, woody oud with amber and spice. Lasts through the day and gets better into the evening."],
  ["Citrus Bloom Pocket Perfume 20ml", "perfumes", 299, 449, 40, 0, "Droplets", "#fff0d6", "#c26a10", "", "", "A fresh citrus and jasmine scent in a pocket-size bottle that fits any bag."],
  ["Ultra Slim Clear iPhone Case", "phoneCases", 399, 799, 35, 0, "Smartphone", "#dff1fb", "#1f6f9f", "Clear #e5e7eb|Black #18181b", "iPhone 15,iPhone 16,iPhone 17", "A thin, scratch-resistant case with raised edges that protect the camera and screen."],
  ["20W Fast Charging Power Adapter", "phone", 549, 999, 26, 1, "PlugZap", "#e3f6ea", "#1e7f4b", "White #f4f4f5", "", "A compact 20W USB-C wall charger with overheat protection, made for phones and earbuds."],
  ["Foldable Desk Phone Stand", "phone", 249, 499, 50, 0, "TabletSmartphone", "#eef0f3", "#475467", "Black #18181b|Silver #c0c0c0", "", "An aluminium stand with adjustable angles. Folds flat and holds phones up to 7 inches."],
  ["Stainless Steel Chef Knife Set", "kitchen", 899, 1799, 15, 1, "ChefHat", "#e6eef5", "#34566f", "", "", "A three-piece set with sharp, rust-resistant blades and comfortable handles."],
  ["Silicone Cooking Utensil Set of 6", "kitchen", 649, 1099, 24, 0, "CookingPot", "#fde9df", "#b5491f", "Teal #14b8a6|Grey #71717a", "", "Heat-safe spatulas and spoons that won't scratch non-stick pans. Dishwasher safe."],
  ["Airtight Glass Storage Jars Set", "kitchen", 799, 1299, 0, 0, "Soup", "#e8f5ec", "#2f7a4f", "", "", "A set of three borosilicate jars with bamboo lids to keep pantry staples fresh."],
  ["Ceramic Aroma Diffuser Lamp", "home", 1099, 1899, 12, 1, "Lamp", "#fbeee0", "#a8652a", "Cream #fef3c7|Grey #71717a", "", "A soft-glow lamp and essential oil diffuser that makes any room feel calmer."],
  ["Hand Poured Soy Candle Trio", "home", 549, 899, 28, 0, "Flame", "#fdeaea", "#b13e3e", "", "", "Three clean-burning soy candles in vanilla, lavender and sandalwood."],
  ["Oversized Fleece Sweatshirt", "fashion", 999, 1999, 20, 0, "Shirt", "#ececf1", "#3f3f58", "Black #18181b|Beige #d4c4a8|Maroon #7f1d1d", "S,M,L,XL", "A soft brushed-fleece sweatshirt with a relaxed fit and ribbed cuffs."],
  ["Satin Scrunchie Pack of 6", "hair", 199, 399, 60, 0, "Ribbon", "#fce7f1", "#b0326f", "Pink #ec4899|Black #18181b|Cream #fef3c7", "", "Gentle satin scrunchies that hold well without creasing or pulling your hair."],
  ["Shea Butter Body Lotion 300ml", "lotions", 379, 549, 33, 0, "Droplet", "#fff5dc", "#a97a15", "", "", "A rich, non-sticky lotion with shea butter that keeps skin soft for 24 hours."],
  ["Pro Makeup Brush Set of 12", "brushes", 749, 1499, 16, 0, "Brush", "#f3e8fb", "#7b3fa8", "Rose Gold #b76e79|Black #18181b", "", "Soft synthetic brushes for face and eyes, with a travel pouch included."],
  ["Mini Quilted Crossbody Bag", "fashion", 1199, 2299, 9, 1, "ShoppingBag", "#f6e7e0", "#8f4a2f", "Black #18181b|Beige #d4c4a8", "", "A compact quilted bag with a chain strap and room for your phone, cards and keys."],
];

const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fileOf = (name) => `demo-${slugOf(name)}.webp`;

async function makeImages() {
  for (const [name, , , , , , icon, pale, deep] of PRODUCTS) {
    const inner = renderToStaticMarkup(createElement(icons[icon], { size: 340, color: deep, strokeWidth: 1.15, x: 230, y: 230 }));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${pale}"/></linearGradient></defs><rect width="800" height="800" fill="${pale}"/><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="400" r="280" fill="#ffffff" fill-opacity=".55"/>${inner}</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(`public/uploads/products/${fileOf(name)}`);
  }
  console.log(`Made ${PRODUCTS.length} images`);
}

const sql = () => postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

async function add() {
  const db = sql();
  try {
    await db.begin(async (tx) => {
      for (const [i, [name, category, price, compare, stock, featured, , , , colors, sizes, description]] of PRODUCTS.entries()) {
        const slug = slugOf(name);
        const colorsJson = colors ? JSON.stringify(colors.split("|").map((c) => ({ name: c.slice(0, c.lastIndexOf(" ")), code: c.slice(c.lastIndexOf(" ") + 1) }))) : null;
        const [{ id }] = await tx`
          INSERT INTO products (name, slug, sku, category_id, price, compare_price, quantity, is_featured, status, image, short_description, description, colors_json, size, product_type, created_at)
          VALUES (${name}, ${slug}, ${`DEMO-${String(i + 1).padStart(2, "0")}`}, ${CATEGORY[category]}, ${price}, ${compare}, ${stock}, ${featured}, 'active', ${fileOf(name)}, ${description.split(". ")[0]}, ${description},
            ${colorsJson}, ${sizes || null}, 'Demo', LOCALTIMESTAMP - make_interval(hours => ${i * 5}))
          ON CONFLICT (slug) DO UPDATE SET image = EXCLUDED.image, updated_at = LOCALTIMESTAMP
          RETURNING id
        `;
        await tx`DELETE FROM product_images WHERE product_id = ${id}`;
        await tx`INSERT INTO product_images (product_id, image_path, alt_text, is_main, is_primary, sort_order) VALUES (${id}, ${fileOf(name)}, ${name}, 1, 1, 0)`;
        // Demo items never go in the sitemap or in search results.
        await tx`INSERT INTO seo_meta (entity_type, entity_key, noindex) VALUES ('product', ${String(id)}, 1) ON CONFLICT (entity_type, entity_key) DO UPDATE SET noindex = 1`;
      }
    });
    console.log(`Added ${PRODUCTS.length} demo products`);
  } finally {
    await db.end();
  }
}

async function remove() {
  const db = sql();
  try {
    await db.begin(async (tx) => {
      const demo = await tx`SELECT id FROM products WHERE product_type = 'Demo' AND sku LIKE 'DEMO-%'`;
      const ids = demo.map((p) => p.id);
      if (!ids.length) return console.log("No demo products to remove");
      const ordered = await tx`SELECT DISTINCT product_id FROM order_items WHERE product_id IN ${tx(ids)}`;
      const orderedIds = ordered.map((o) => o.product_id);
      if (orderedIds.length) await tx`UPDATE products SET status = 'inactive' WHERE id IN ${tx(orderedIds)}`;
      const free = ids.filter((id) => !orderedIds.includes(id));
      if (free.length) {
        for (const table of ["product_images", "product_collection_map", "product_seo_tags", "cart", "wishlist"]) await tx`DELETE FROM ${tx(table)} WHERE product_id IN ${tx(free)}`;
        await tx`DELETE FROM seo_meta WHERE entity_type = 'product' AND entity_key IN ${tx(free.map(String))}`;
        await tx`DELETE FROM products WHERE id IN ${tx(free)}`;
      }
      console.log(`Removed ${free.length} demo products; ${orderedIds.length} kept as inactive because they have orders`);
    });
  } finally {
    await db.end();
  }
}

const command = process.argv[2];
if (command === "images") await makeImages();
else if (command === "add") await add();
else if (command === "remove") await remove();
else console.log("Usage: demo-products.mjs images | add | remove");
