import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticle, getFeatured } from "@/lib/api/content";
import { siteUrl } from "@/lib/site";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { SourceAttribution } from "@/components/content/SourceAttribution";
import { RumorBadge } from "@/components/content/RumorBadge";
import { ArticleCard } from "@/components/content/ArticleCard";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug, locale);
  if (!article) return {};
  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.summary ?? undefined,
    openGraph: article.coverImageUrl
      ? { images: [{ url: article.coverImageUrl }] }
      : undefined,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("News");
  const tc = await getTranslations("Common");

  const article = await getArticle(slug, locale);
  if (!article) notFound();

  const featured = (await getFeatured(locale)).filter((a) => a.slug !== slug);

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.metaDescription ?? article.summary ?? undefined,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.publishedAt ?? undefined,
    inLanguage: locale,
    mainEntityOfPage: `${siteUrl}/${locale}/${locale === "es" ? "noticias" : "news"}/${slug}`,
    ...(article.sourceName
      ? { citation: article.sourceUrl ?? article.sourceName }
      : {}),
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: t("title"), href: "/noticias" },
          { label: article.title },
        ]}
      />

      <article className="flex min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
        <header className="flex flex-col gap-3">
          {article.category === "Rumor" && (
            <span>
              <RumorBadge />
            </span>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            {article.title}
          </h1>
          {date && (
            <p className="text-sm text-[var(--muted-foreground)]">
              <time dateTime={article.publishedAt ?? undefined}>{date}</time>
            </p>
          )}
          {article.summary && (
            <p className="text-lg text-[var(--muted-foreground)]">
              {article.summary}
            </p>
          )}
        </header>

        {article.coverImageUrl && (
          <span className="relative block w-full overflow-hidden rounded-xl bg-[var(--muted)]">
            <span className="block aspect-[16/9] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.coverImageUrl}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            </span>
          </span>
        )}

        <div
          className="article-body flex min-w-0 flex-col gap-4 text-[var(--foreground)] leading-relaxed [&_a]:text-[var(--accent)] [&_a]:underline [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_video]:h-auto [&_video]:max-w-full"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml ?? "" }}
        />

        <div className="border-t border-[var(--border)] pt-4">
          <SourceAttribution
            sourceName={article.sourceName}
            sourceUrl={article.sourceUrl}
          />
        </div>
      </article>

      {featured.length > 0 && (
        <section className="border-t border-[var(--border)] pt-8">
          <h2 className="mb-4 font-display text-xl font-semibold">
            {t("alsoRead")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
