import { createFileRoute } from "@tanstack/react-router";
import { Globe, Mail, Phone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getLandingPage, type PublicLandingPage } from "@/lib/pages.functions";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({
    meta: [
      { title: "Landing page — NFC Smart Keychain" },
      {
        name: "description",
        content: "A simple contact and links page shared from an NFC keychain.",
      },
      { property: "og:title", content: "Landing page — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "A simple contact and links page shared from an NFC keychain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<PublicLandingPage | null>(null);

  useEffect(() => {
    let active = true;
    getLandingPage({ data: { slug } })
      .then((p) => active && setPage(p))
      .catch(() => active && setPage({ found: false }));
    return () => {
      active = false;
    };
  }, [slug]);

  if (!page) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!page.found) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-2 px-6">
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page doesn’t exist or isn’t published.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <div className="flex flex-col items-center text-center">
        {page.imageUrl && (
          <img
            src={page.imageUrl}
            alt={page.title}
            className="size-24 rounded-2xl border border-border object-cover"
          />
        )}
        <h1 className="mt-4 text-2xl font-semibold text-foreground">{page.title}</h1>
        {page.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {page.description}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {page.googleReview && (
          <Button asChild size="lg" className="w-full">
            <a href={page.googleReview} target="_blank" rel="noreferrer noopener">
              <Star className="mr-2 size-4" /> Leave a Google review
            </a>
          </Button>
        )}
        {page.website && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={page.website} target="_blank" rel="noreferrer noopener">
              <Globe className="mr-2 size-4" /> Website
            </a>
          </Button>
        )}
        {page.phone && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={`tel:${page.phone}`}>
              <Phone className="mr-2 size-4" /> Call {page.phone}
            </a>
          </Button>
        )}
        {page.email && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={`mailto:${page.email}`}>
              <Mail className="mr-2 size-4" /> Email
            </a>
          </Button>
        )}
        {page.socials.map((s) => (
          <Button key={s.url} asChild variant="outline" size="lg" className="w-full">
            <a href={s.url} target="_blank" rel="noreferrer noopener">
              {s.label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
