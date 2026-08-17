import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { siteUrl } from "@/lib/site";
import { getSquad, getMatches } from "@/lib/api/sports";
import { slugify, matchSlug } from "@/lib/slug";

type Href = Parameters<typeof getPathname>[0]["href"];

function hreflangKey(locale: string): string {
  return locale === "es" ? "es-AR" : locale;
}

function entryFor(href: Href): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[hreflangKey(locale)] = siteUrl + getPathname({ href, locale });
  }
  languages["x-default"] = siteUrl + getPathname({ href, locale: routing.defaultLocale });

  return {
    url: siteUrl + getPathname({ href, locale: routing.defaultLocale }),
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticHrefs: Href[] = [
    "/",
    "/partidos",
    "/partidos/fixture",
    "/partidos/resultados",
    "/plantel",
    "/posiciones",
    "/en-vivo",
    "/bombonera",
  ];

  // Dynamic slugs — tolerate the API being unavailable at build time.
  const [squad, matches] = await Promise.all([
    getSquad().catch(() => []),
    getMatches({ pageSize: 50 }).catch(() => ({ items: [], page: 1, pageSize: 50, total: 0 })),
  ]);

  const playerHrefs: Href[] = squad.map((p) => ({
    pathname: "/jugadores/[slug]",
    params: { slug: slugify(p.name) },
  }));
  const matchHrefs: Href[] = matches.items.map((m) => ({
    pathname: "/partido/[slug]",
    params: { slug: matchSlug(m) },
  }));

  return [...staticHrefs, ...playerHrefs, ...matchHrefs].map(entryFor);
}
