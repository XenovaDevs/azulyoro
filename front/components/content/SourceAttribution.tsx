import { useTranslations } from "next-intl";

/**
 * Legally-required source attribution shown on every article. Links out to the
 * original source with rel="nofollow noopener" in a new tab.
 */
export function SourceAttribution({
  sourceName,
  sourceUrl,
}: {
  sourceName: string | null;
  sourceUrl: string | null;
}) {
  const t = useTranslations("News");
  if (!sourceName) return null;

  return (
    <p className="text-sm text-[var(--muted-foreground)] [overflow-wrap:anywhere]">
      {t("source")}:{" "}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="nofollow noopener"
          className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {sourceName}
        </a>
      ) : (
        <span className="font-medium">{sourceName}</span>
      )}
    </p>
  );
}
