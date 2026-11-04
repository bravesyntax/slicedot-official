import { notFound } from "next/navigation";

// Sends unknown URLs to app/(site)/not-found.tsx, so a 404 keeps the store header and footer.
export default function Missing() {
  notFound();
}
