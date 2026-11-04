import { CtaLink, PageHero } from "@/components/site/ui";

export default function NotFound() {
  return (
    <PageHero eyebrow="404" title="Page not found" actions={<CtaLink href="/">Back to Home</CtaLink>}>
      The page you are looking for has moved or doesn&apos;t exist.
    </PageHero>
  );
}
