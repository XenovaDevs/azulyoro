"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ARGENTINA_TIMEZONE,
  formatDateInZone,
} from "@/lib/dateUtils";

interface MatchKickoffTimeProps {
  dateUtc: string;
  locale?: string;
  variant?: "short" | "full";
  className?: string;
  showTimezoneBadge?: boolean;
}

function subscribe() {
  return () => {};
}

function getClientTimezone(): string | null {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved && resolved !== ARGENTINA_TIMEZONE ? resolved : null;
  } catch {
    return null;
  }
}

function getServerTimezone(): string | null {
  return null;
}

export function MatchKickoffTime({
  dateUtc,
  locale = "es",
  variant = "short",
  className = "",
  showTimezoneBadge = true,
}: MatchKickoffTimeProps) {
  const userTz = useSyncExternalStore(subscribe, getClientTimezone, getServerTimezone);
  const [showUserTz, setShowUserTz] = useState(false);

  const activeZone = showUserTz && userTz ? userTz : ARGENTINA_TIMEZONE;
  const isArgentina = activeZone === ARGENTINA_TIMEZONE;

  const dateOptions: Intl.DateTimeFormatOptions =
    variant === "full"
      ? { dateStyle: "full", timeStyle: "short" }
      : { dateStyle: "medium", timeStyle: "short" };

  const formatted = formatDateInZone(dateUtc, locale, activeZone, dateOptions);

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <time dateTime={dateUtc}>{formatted}</time>
      {showTimezoneBadge && (
        <span
          className="inline-flex items-center gap-1 rounded bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
          title={isArgentina ? "Hora oficial de Argentina (UTC-3)" : `Tu zona horaria: ${userTz}`}
        >
          {isArgentina ? "ARG" : "TU HORA"}
        </span>
      )}
      {userTz && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowUserTz((prev) => !prev);
          }}
          className="text-[11px] font-medium text-[var(--oro-500)] underline decoration-dotted underline-offset-2 hover:text-[var(--oro-400)] transition-colors"
          title={
            showUserTz
              ? "Cambiar a hora de Argentina"
              : "Ver en tu hora local"
          }
        >
          {showUserTz
            ? locale === "es"
              ? "(ver en hora ARG)"
              : "(view in ARG time)"
            : locale === "es"
              ? "(ver en tu hora)"
              : "(view in your time)"}
        </button>
      )}
    </span>
  );
}
