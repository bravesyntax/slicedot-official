import {
  BarChart3, Code2, Gauge, Globe, Handshake, Headphones, LayoutTemplate, Lock, Megaphone, Palette, PenTool, Rocket, Search, Server, ShieldCheck,
  ShoppingCart, Smartphone, Sparkles, Zap, type LucideIcon,
} from "lucide-react";

// Icons for admin-editable feature cards (location services features JSON). The JSON stores a short name;
// emojis saved before the switch to icons are mapped to the closest match.
export const FEATURE_ICONS: Record<string, LucideIcon> = {
  code: Code2, palette: Palette, search: Search, smartphone: Smartphone, zap: Zap, handshake: Handshake, rocket: Rocket,
  lock: Lock, chart: BarChart3, cart: ShoppingCart, globe: Globe, sparkles: Sparkles, layout: LayoutTemplate, pen: PenTool,
  megaphone: Megaphone, server: Server, support: Headphones, shield: ShieldCheck, speed: Gauge,
};

const EMOJI: Record<string, string> = {
  "🎨": "palette", "💻": "code", "🔍": "search", "📱": "smartphone", "⚡": "zap", "🤝": "handshake", "🚀": "rocket", "🔒": "lock",
  "📊": "chart", "📈": "chart", "🛒": "cart", "🌐": "globe", "✨": "sparkles", "🖥️": "layout", "✏️": "pen", "📣": "megaphone",
  "🛠️": "server", "🔧": "server", "🎧": "support", "🛡️": "shield",
};

export const FEATURE_ICON_NAMES = Object.keys(FEATURE_ICONS);

export default function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const key = (name ?? "").trim();
  const Icon = FEATURE_ICONS[key.toLowerCase()] ?? FEATURE_ICONS[EMOJI[key] ?? EMOJI[key.replace(/️/g, "")] ?? ""] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
