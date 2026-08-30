export const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Formats a UTC date string into Argentina time by default or specified timezone. */
export function formatArgentinaDate(
  dateUtc: string | Date,
  locale = "es",
  options: Intl.DateTimeFormatOptions = {},
): string {
  try {
    const d = typeof dateUtc === "string" ? new Date(dateUtc) : dateUtc;
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
      timeZone: ARGENTINA_TIMEZONE,
      ...options,
    }).format(d);
  } catch {
    return new Date(dateUtc).toLocaleString(locale);
  }
}

/** Formats date into custom timezone. */
export function formatDateInZone(
  dateUtc: string | Date,
  locale = "es",
  timeZone = ARGENTINA_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {},
): string {
  try {
    const d = typeof dateUtc === "string" ? new Date(dateUtc) : dateUtc;
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
      timeZone: timeZone || ARGENTINA_TIMEZONE,
      ...options,
    }).format(d);
  } catch {
    return new Date(dateUtc).toLocaleString(locale);
  }
}

/** Formats standard match kickoff datetime. */
export function formatKickoffFull(
  dateUtc: string | Date,
  locale = "es",
  timeZone = ARGENTINA_TIMEZONE,
): string {
  return formatDateInZone(dateUtc, locale, timeZone, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

/** Formats short match card datetime. */
export function formatKickoffShort(
  dateUtc: string | Date,
  locale = "es",
  timeZone = ARGENTINA_TIMEZONE,
): string {
  return formatDateInZone(dateUtc, locale, timeZone, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
