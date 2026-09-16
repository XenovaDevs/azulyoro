import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getAllMatches,
  getMatch,
  getMatchEvents,
  getMatchLineups,
  getMatchPlayerStats,
  getMatchStatistics,
} from "@/lib/api/sports";
import { matchSlug } from "@/lib/slug";
import { classifyStatus, statusTranslationKey } from "@/lib/matchStatus";
import { siteUrl } from "@/lib/site";
import { LiveMatchStream } from "@/components/sports/LiveMatchStream";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchKickoffTime } from "@/components/sports/MatchKickoffTime";
import { MatchEventsList } from "@/components/sports/MatchEventsList";
import { MatchLineupsView } from "@/components/sports/MatchLineupsView";
import { MatchStatistics } from "@/components/sports/MatchStatistics";
import { MatchDetailTabs } from "@/components/sports/MatchDetailTabs";
import { sportsCompetitionLabel, sportsRoundLabel } from "@/lib/sports-labels";
import type { MatchDto } from "@/lib/api/types";

export const revalidate = 0;

function TeamCrest({ name, logoUrl }: { name: string | null; logoUrl: string | null }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] p-2 sm:h-16 sm:w-16">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name ?? ""}
          width={56}
          height={56}
          loading="eager"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="font-display text-xl font-bold text-[var(--muted-foreground)]">
          {(name ?? "?").slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}

const resolveMatch = cache(async (slug: string): Promise<MatchDto | null> => {
  const date = /-(\d{4}-\d{2}-\d{2})$/.exec(slug)?.[1];
  if (!date) return null;
  const from = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(from.getTime()) || from.toISOString().slice(0, 10) !== date) return null;
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  const items = await getAllMatches({ bocaOnly: false, from: from.toISOString(), to: to.toISOString() });
  return items.find((match) => matchSlug(match) === slug) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const match = await resolveMatch(slug);
  if (!match) return {};
  const title = `${match.homeTeamName} vs ${match.awayTeamName}`;
  const t = await getTranslations({ locale, namespace: "Matches" });
  return {
    title,
    description: `${title} · ${match.competitionName ?? ""} — ${t("title")}`,
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Matches");
  const tc = await getTranslations("Common");

  const match = await resolveMatch(slug);
  if (!match) notFound();

  const state = classifyStatus(match.status);
  const played = state !== "scheduled";

  const [detail, events, lineups, stats, teamStats] = await Promise.all([
    getMatch(match.id),
    played ? getMatchEvents(match.id) : Promise.resolve([]),
    played ? getMatchLineups(match.id) : Promise.resolve([]),
    played ? getMatchPlayerStats(match.id) : Promise.resolve([]),
    played ? getMatchStatistics(match.id) : Promise.resolve(null),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeamName} vs ${match.awayTeamName}`,
    startDate: match.dateUtc,
    eventStatus:
      state === "finished"
        ? "https://schema.org/EventCompleted"
        : "https://schema.org/EventScheduled",
    location: detail?.venue ? { "@type": "Place", name: detail.venue } : undefined,
    competitor: [
      { "@type": "SportsTeam", name: match.homeTeamName },
      { "@type": "SportsTeam", name: match.awayTeamName },
    ],
    url: `${siteUrl}/${locale}/${locale === "es" ? "partido" : "match"}/${slug}`,
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: t("title"), href: "/partidos" },
          { label: `${match.homeTeamName} vs ${match.awayTeamName}` },
        ]}
      />

      {state === "live" || state === "scheduled" ? (
        <LiveMatchStream
          key={match.id}
          match={match}
          detail={detail}
          events={events}
          lineups={lineups}
          stats={stats}
          teamStats={teamStats}
          locale={locale}
          labels={{
            live: t("live"),
            statusScheduled: t("statusScheduled"),
            statusFinished: t("statusFinished"),
            events: t("events"),
            eventsEmpty: t("eventsEmpty"),
            lineups: t("lineups"),
            playerStats: t("playerStats"),
            notStartedTitle: t("notStartedTitle"),
            notStartedDescription: t("notStartedDescription"),
          }}
        />
      ) : (
        <>
      {/* Scoreboard */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--azul-900)] to-[var(--card)] p-3.5 sm:p-6 text-[var(--foreground)] shadow-lg">
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
          <span className="text-[var(--oro-500)] truncate max-w-[65%]">{sportsCompetitionLabel(match.competitionName, locale)}</span>
          <span className="text-[var(--muted-foreground)] shrink-0">{t(statusTranslationKey(match.status))}</span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-4">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center">
            <TeamCrest name={match.homeTeamName} logoUrl={match.homeTeamLogoUrl} />
            <span className="max-w-full break-words font-display text-xs font-semibold sm:text-base">
              {match.homeTeamName}
            </span>
          </div>

          <div className="px-1 sm:px-2 text-center">
            <div className="tabular-nums text-2xl font-bold sm:text-5xl">
              {played ? `${match.homeGoals ?? "—"} : ${match.awayGoals ?? "—"}` : "vs"}
            </div>
            {played && detail && (detail.htHome != null || detail.htAway != null) && (
              <div className="mt-1 text-[11px] sm:text-xs text-[var(--muted-foreground)]">
                {locale === "es" ? "Entretiempo" : "Half-time"} {detail.htHome ?? "—"}-{detail.htAway ?? "—"}
              </div>
            )}
            {match.penaltyHome != null && match.penaltyAway != null ? (
              <p className="mt-1.5 text-xs sm:text-sm font-semibold">{t("penalties")}: {match.penaltyHome} – {match.penaltyAway}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center">
            <TeamCrest name={match.awayTeamName} logoUrl={match.awayTeamLogoUrl} />
            <span className="max-w-full break-words font-display text-xs font-semibold sm:text-base">
              {match.awayTeamName}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-center text-sm text-[var(--muted-foreground)]">
          <MatchKickoffTime
            dateUtc={match.dateUtc}
            locale={locale}
            variant="full"
            showTimezoneBadge
          />
          {detail?.venue ? <span>· {detail.venue}</span> : null}
          {detail?.round ? <span>· {sportsRoundLabel(detail.round, locale)}</span> : null}
        </div>
      </section>

      {/* Interactive Tabs: Estadísticas (default), Alineaciones, Cronología, Foro */}
      <MatchDetailTabs
        match={match}
        detail={detail}
        events={events}
        lineups={lineups}
        stats={stats}
        teamStats={teamStats}
        locale={locale}
        labels={{
          stats: locale === "es" ? "Estadísticas" : "Statistics",
          lineups: t("lineups"),
          events: t("events"),
          forum: locale === "es" ? "Foro y Debate" : "Match Forum",
          eventsEmpty: t("eventsEmpty"),
          playerStats: t("playerStats"),
          player: t("player"),
          minutesShort: t("minutesShort"),
          goalsShort: t("goalsShort"),
          assistsShort: t("assistsShort"),
          ratingShort: t("ratingShort"),
        }}
      />
        </>
      )}
    </main>
  );
}
