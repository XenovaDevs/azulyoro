import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllMatches, getCompetitions } from "@/lib/api/sports";
import { FixtureList } from "@/components/sports/FixtureList";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupByCompetition } from "@/lib/matches";
import { Link } from "@/i18n/navigation";
import { LiveRefresher } from "@/components/sports/LiveRefresher";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Matches" });
  return { title: t("fixtureMetaTitle"), description: t("fixtureMetaDescription") };
}

export default async function FixturePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Matches");
  const tc = await getTranslations("Common");

  const [competitions, query] = await Promise.all([getCompetitions(), searchParams]);
  const years = [...new Set(competitions.flatMap((competition) => competition.seasons))].sort((a, b) => b - a);
  const requestedYear = Number(query.season);
  const currentYear = new Date().getUTCFullYear();
  const season = years.includes(requestedYear) ? requestedYear : years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);
  const all = await getAllMatches({ season });
  const items = all
    .slice()
    .sort((a, b) => +new Date(a.dateUtc) - +new Date(b.dateUtc));
  const groups = groupByCompetition(items, t("title"));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <LiveRefresher />
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: t("title"), href: "/partidos" },
          { label: t("fixtureTitle") },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("fixtureTitle")}
        </h1>
        <p className="text-[var(--muted-foreground)]">{t("fixtureDescription")}</p>
        <Link href="/posiciones" className="text-sm font-medium text-[var(--accent)] hover:underline">{t("competitions")}</Link>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={locale === "es" ? "Temporada" : "Season"}>
        {years.map((year) => <Link key={year} href={{ pathname: "/partidos/fixture", query: { season: year } }} aria-current={year === season ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${year === season ? "border-[var(--accent)] bg-[var(--muted)]" : "border-[var(--border)]"}`}>{year}</Link>)}
      </nav>

      {groups.length > 0 ? (
        <FixtureList groups={groups} locale={locale} />
      ) : (
        <EmptyState title={t("fixtureEmpty")} />
      )}
    </main>
  );
}
