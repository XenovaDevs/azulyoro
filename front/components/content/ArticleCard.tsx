import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArticleListItemDto } from "@/lib/api/types";
import { RumorBadge } from "./RumorBadge";

const CATEGORY_KEY: Record<string, string> = {
  News: "categoryNews",
  Rumor: "categoryRumor",
  Editorial: "categoryEditorial",
};

/**
 * Article summary card: 16:9 cover (CLS-safe fixed box), category badge, title,
 * summary and date. Shows RumorBadge for rumors. Links to the article detail.
 */
export function ArticleCard({ article }: { article: ArticleListItemDto }) {
  const t = useTranslations("News");
  const locale = useLocale();

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={{ pathname: "/noticias/[slug]", params: { slug: article.slug } }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] [overflow-wrap:anywhere] transition-colors hover:border-[var(--accent)]"
    >
      <span className="relative block w-full overflow-hidden bg-[var(--muted)]">
        <span className="block aspect-[16/9] w-full">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImageUrl}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {t(CATEGORY_KEY[article.category] ?? "categoryNews")}
          </span>
          {article.category === "Rumor" && <RumorBadge />}
        </span>

        <span className="block font-display text-lg font-semibold leading-snug group-hover:text-[var(--accent)]">
          {article.title}
        </span>

        {article.summary && (
          <span className="line-clamp-3 text-sm text-[var(--muted-foreground)]">
            {article.summary}
          </span>
        )}

        {date && (
          <time
            dateTime={article.publishedAt ?? undefined}
            className="mt-auto pt-1 text-xs text-[var(--muted-foreground)]"
          >
            {date}
          </time>
        )}
      </span>
    </Link>
  );
}
