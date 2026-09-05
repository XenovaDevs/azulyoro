import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCompetitions, getCompetitionOverview } from "@/lib/api/sports";
import { StandingsFilterView } from "@/components/sports/StandingsFilterView";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompetitionSelector } from "@/components/sports/CompetitionSelector";
import { LiveRefresher } from "@/components/sports/LiveRefresher";
import { ARGENTINA_TIMEZONE, formatDateInZone } from "@/lib/dateUtils";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Standings" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ competition?: string; season?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Standings");
  const tc = await getTranslations("Common");

  const [competitions, query] = await Promise.all([getCompetitions(), searchParams]);
  const years = [...new Set(competitions.flatMap((competition) => competition.seasons))].sort((a, b) => b - a);
  const requestedYear = Number(query.season);
  const currentYear = new Date().getUTCFullYear();
  const season = years.includes(requestedYear) ? requestedYear : years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);
  const available = competitions.filter((competition) => competition.seasons.includes(season));
  const competition = available.find((item) => item.id === query.competition)
    ?? available.find((item) => /liga profesional|primera divisi/i.test(item.name)) ?? available[0];
  const overview = competition ? await getCompetitionOverview(competition.id, season) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 sm:gap-8 px-3 sm:px-4 py-6 sm:py-10">
      <LiveRefresher />
      <Breadcrumbs
        items={[{ label: tc("home"), href: "/" }, { label: t("title") }]}
      />

      <header className="flex flex-col gap-1.5 sm:gap-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)]">{t("description")}</p>
      </header>

      {competition && overview ? (
        <>
          <CompetitionSelector competitions={competitions} competitionId={competition.id} season={season} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{competition.name} · {season}</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {overview.updatedAt ? t("updatedAt", { date: formatDateInZone(overview.updatedAt, locale, ARGENTINA_TIMEZONE, { dateStyle: "short", timeStyle: "short" }) }) : t("awaitingUpdate")}
            </p>
          </div>
          <StandingsFilterView key={`${competition.id}-${season}`} overview={overview} locale={locale} />
        </>
      ) : (
        <EmptyState title={t("empty")} />
      )}
    </main>
  );
}
