import type { EventDto } from "@/lib/api/types";

interface MatchEventsListProps {
  events: EventDto[];
  locale?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
}

function translateDetail(type: string, detail: string | null, locale = "es"): string {
  const isEs = locale === "es";
  const d = (detail ?? "").toLowerCase();
  const t = type.toLowerCase();

  if (t === "goal") {
    if (d.includes("own goal") || d.includes("own-goal") || d.includes("en contra")) {
      return isEs ? "Gol en contra" : "Own Goal";
    }
    if (d.includes("penalty") || d.includes("penal")) {
      return isEs ? "Gol de penal" : "Penalty Goal";
    }
    if (d.includes("missed penalty") || d.includes("penal fallado")) {
      return isEs ? "Penal fallado" : "Missed Penalty";
    }
    if (d.includes("header") || d.includes("cabeza")) {
      return isEs ? "Gol de cabeza" : "Header Goal";
    }
    return isEs ? "Gol" : "Goal";
  }

  if (t === "card") {
    if (d.includes("second yellow") || d.includes("segunda amarilla") || d.includes("yellow red")) {
      return isEs ? "Segunda tarjeta amarilla (Roja)" : "Second Yellow Card";
    }
    if (d.includes("red") || d.includes("roja")) {
      return isEs ? "Tarjeta roja directa" : "Red Card";
    }
    if (d.includes("yellow") || d.includes("amarilla")) {
      return isEs ? "Tarjeta amarilla" : "Yellow Card";
    }
    return isEs ? "Tarjeta" : "Card";
  }

  if (t === "substitution" || t === "subst") {
    return isEs ? "Cambio" : "Substitution";
  }

  if (t === "var") {
    if (d.includes("goal cancelled") || d.includes("anulado")) {
      return isEs ? "Gol anulado por VAR" : "Goal Disallowed (VAR)";
    }
    if (d.includes("penalty confirmed") || d.includes("penal")) {
      return isEs ? "Penal chequeado (VAR)" : "Penalty Awarded (VAR)";
    }
    if (d.includes("card") || d.includes("tarjeta")) {
      return isEs ? "Tarjeta revisada (VAR)" : "Card Review (VAR)";
    }
    return isEs ? "Revisión VAR" : "VAR Review";
  }

  return detail ?? (isEs ? "Incidencia" : "Event");
}

function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string | null;
  photoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <span className={`relative inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)] overflow-hidden border border-[var(--border)] shadow-xs`}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name ?? ""}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      ) : (
        <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
          {(name ?? "J").slice(0, 2)}
        </span>
      )}
    </span>
  );
}

function EventIcon({ type, detail }: { type: string; detail: string | null }) {
  const t = type.toLowerCase();
  const d = (detail ?? "").toLowerCase();

  if (t === "goal") {
    if (d.includes("missed penalty")) {
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400" title="Penal fallado">
          ✕
        </span>
      );
    }
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-sm" title="Gol">
        ⚽
      </span>
    );
  }

  if (t === "card") {
    if (d.includes("second yellow") || d.includes("segunda amarilla")) {
      return (
        <span className="flex h-6 w-6 items-center justify-center gap-0.5" title="Doble amarilla">
          <span className="h-4 w-3 rounded-xs bg-amber-400 shadow-xs inline-block" />
          <span className="h-4 w-3 rounded-xs bg-rose-600 shadow-xs inline-block -ml-1.5" />
        </span>
      );
    }
    if (d.includes("red") || d.includes("roja")) {
      return (
        <span className="flex h-6 w-6 items-center justify-center" title="Tarjeta roja">
          <span className="h-4 w-3 rounded-xs bg-rose-600 shadow-xs inline-block" />
        </span>
      );
    }
    return (
      <span className="flex h-6 w-6 items-center justify-center" title="Tarjeta amarilla">
        <span className="h-4 w-3 rounded-xs bg-amber-400 shadow-xs inline-block" />
      </span>
    );
  }

  if (t === "substitution" || t === "subst") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-400" title="Cambio">
        🔄
      </span>
    );
  }

  if (t === "var") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400" title="VAR">
        📺
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted)] text-xs">
      ⏱️
    </span>
  );
}

export function MatchEventsList({
  events,
  locale = "es",
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: MatchEventsListProps) {
  const isEs = locale === "es";

  const resolveTeamName = (e: EventDto) => {
    if (e.teamName) return e.teamName;
    if (e.teamId && e.teamId === homeTeamId) return homeTeamName ?? "";
    if (e.teamId && e.teamId === awayTeamId) return awayTeamName ?? "";
    return "";
  };

  return (
    <ol className="flex flex-col gap-2.5">
      {events.map((e, i) => {
        const typeLower = e.type.toLowerCase();
        const isSub = typeLower === "substitution" || typeLower === "subst";
        const translatedType = translateDetail(e.type, e.detail, locale);
        const teamName = resolveTeamName(e);

        return (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))]"
          >
            {/* Minute */}
            <span className="w-12 shrink-0 tabular-nums font-bold text-[var(--accent)] text-sm">
              {e.minute}
              {e.extraMinute ? `+${e.extraMinute}` : ""}&apos;
            </span>

            {/* Event Icon */}
            <span className="shrink-0">
              <EventIcon type={e.type} detail={e.detail} />
            </span>

            {/* Event Content with Player Avatars */}
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              {isSub ? (
                <div className="flex flex-wrap items-center gap-3 font-medium">
                  {/* Player In */}
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs uppercase tracking-wide font-bold">⬆️ {isEs ? "Entra:" : "In:"}</span>
                    <PlayerAvatar name={e.playerName} photoUrl={e.playerPhotoUrl} size="sm" />
                    <span className="text-[var(--foreground)] font-bold">
                      {e.playerName || (isEs ? "Jugador entrante" : "In")}
                    </span>
                  </span>

                  {/* Player Out */}
                  {e.assistName && (
                    <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                      <span className="text-xs uppercase tracking-wide font-bold">⬇️ {isEs ? "Sale:" : "Out:"}</span>
                      <PlayerAvatar name={e.assistName} photoUrl={e.assistPhotoUrl} size="sm" />
                      <span className="text-[var(--muted-foreground)]">
                        {e.assistName}
                      </span>
                    </span>
                  )}

                  <span className="text-xs text-[var(--muted-foreground)]">
                    ({translatedType})
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <PlayerAvatar name={e.playerName} photoUrl={e.playerPhotoUrl} size="sm" />
                  <span className="font-semibold text-[var(--foreground)]">
                    {e.playerName || (isEs ? "Jugador" : "Player")}
                  </span>
                  <span className="text-[var(--muted-foreground)] font-normal">
                    · {translatedType}
                  </span>
                  {e.assistName && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] ml-1">
                      <span>({isEs ? "Asist:" : "Assist:"}</span>
                      <PlayerAvatar name={e.assistName} photoUrl={e.assistPhotoUrl} size="sm" />
                      <span className="font-medium text-[var(--foreground)]">{e.assistName}</span>
                      <span>)</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Team label */}
            {teamName && (
              <span className="shrink-0 rounded bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                {teamName}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

