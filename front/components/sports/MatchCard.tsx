import { getTranslations } from "next-intl/server";
import type { MatchDto } from "@/lib/api/types";
import { classifyStatus } from "@/lib/matchStatus";
import { matchSlug } from "@/lib/slug";
import { Link } from "@/i18n/navigation";
import { LiveScoreBadge } from "./LiveScoreBadge";
import { MatchKickoffTime } from "./MatchKickoffTime";

function TeamRow({
  name,
  logoUrl,
  goals,
  showScore,
}: {
  name: string | null;
  logoUrl: string | null;
  goals: number | null;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            className="h-7 w-7 object-contain"
          />
        ) : (
          <span
            className="h-7 w-7 rounded-full bg-[var(--muted)]"
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name ?? "—"}</span>
      {showScore && (
        <span className="tabular-nums text-lg font-bold">{goals ?? 0}</span>
      )}
    </div>
  );
}

/**
 * Match card: team names + logos (fixed-size box to avoid CLS), competition,
 * local AR datetime, score when played, status. Highlights live matches.
 */
export async function MatchCard({
  match,
  locale,
  linked = false,
}: {
  match: MatchDto;
  locale: string;
  /** Wrap the card in a link to the match detail page. */
  linked?: boolean;
}) {
  const t = await getTranslations("Matches");
  const state = classifyStatus(match.status);
  const showScore = state !== "scheduled";

  const card = (
    <article
      className={`rounded-lg border border-l-[3px] bg-[var(--card)] p-4 transition-all hover:shadow-lg ${
        state === "live"
          ? "border-[color-mix(in_oklab,var(--live)_45%,var(--border))] border-l-[var(--live)]"
          : "border-[var(--border)] border-l-[var(--oro-600)] hover:border-[color-mix(in_oklab,var(--oro-500)_45%,var(--border))]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {match.competitionName ?? ""}
        </span>
        {state === "live" ? (
          <LiveScoreBadge label={t("live")} />
        ) : (
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
            {state === "finished" ? t("statusFinished") : t("statusScheduled")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <TeamRow
          name={match.homeTeamName}
          logoUrl={match.homeTeamLogoUrl}
          goals={match.homeGoals}
          showScore={showScore}
        />
        <TeamRow
          name={match.awayTeamName}
          logoUrl={match.awayTeamLogoUrl}
          goals={match.awayGoals}
          showScore={showScore}
        />
      </div>

      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        <MatchKickoffTime dateUtc={match.dateUtc} locale={locale} variant="short" />
      </div>
    </article>
  );

  if (!linked) {
    return card;
  }

  return (
    <Link
      href={{ pathname: "/partido/[slug]", params: { slug: matchSlug(match) } }}
      className="block transition-transform hover:-translate-y-0.5"
    >
      {card}
    </Link>
  );
}
