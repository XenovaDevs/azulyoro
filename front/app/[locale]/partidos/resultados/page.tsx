import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMatches } from "@/lib/api/sports";
import { FixtureList } from "@/components/sports/FixtureList";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupByDay } from "@/lib/matches";
import { Link } from "@/i18n/navigation";
import { LiveRefresher } from "@/components/sports/LiveRefresher";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Matches" });
  return { title: t("resultsMetaTitle"), description: t("resultsMetaDescription") };
}

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Matches");
  const tc = await getTranslations("Common");

  const query = await searchParams;
  const requestedPage = Number(query.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const finished = await getMatches({ status: "finished", pageSize: 50, page });
  const items = finished?.items ?? [];
  const groups = groupByDay(items, locale, "desc");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <LiveRefresher />
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: t("title"), href: "/partidos" },
          { label: t("resultsTitle") },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("resultsTitle")}
        </h1>
        <p className="text-[var(--muted-foreground)]">{t("resultsDescription")}</p>
        <Link href="/posiciones" className="text-sm font-medium text-[var(--accent)] hover:underline">{t("competitions")}</Link>
      </header>

      {groups.length > 0 ? (
        <FixtureList groups={groups} locale={locale} />
      ) : (
        <EmptyState title={t("resultsEmpty")} />
      )}
      <nav className="flex justify-between gap-4" aria-label={t("resultsTitle")}>
        {page > 1 ? <Link href={{ pathname: "/partidos/resultados", query: { page: page - 1 } }} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">{t("previous")}</Link> : <span />}
        {finished && page * finished.pageSize < finished.total ? <Link href={{ pathname: "/partidos/resultados", query: { page: page + 1 } }} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">{t("next")}</Link> : null}
      </nav>
    </main>
  );
}
