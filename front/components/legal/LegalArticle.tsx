import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/api/legal";

/** Server component: fetch a legal page by slug + locale and render its HTML. */
export async function LegalArticle({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const page = await getLegalPage(slug, locale);
  if (!page) notFound();
  const t = await getTranslations("Legal");

  const date = new Date(page.effectiveDate).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2 border-b border-[var(--border)] pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {page.title}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("effectiveDate", { date })}
        </p>
      </header>

      <div
        className="legal-prose flex min-w-0 flex-col gap-4 text-[var(--foreground)] [overflow-wrap:anywhere] [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_video]:h-auto [&_video]:max-w-full"
        dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
      />
    </main>
  );
}
