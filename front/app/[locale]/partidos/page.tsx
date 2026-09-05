import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMatches, getLiveMatches } from "@/lib/api/sports";
import { MatchCard } from "@/components/sports/MatchCard";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LiveRefresher } from "@/components/sports/LiveRefresher";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Matches" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Matches");
  const tc = await getTranslations("Common");

  const [upcoming, results, live] = await Promise.all([
    getMatches({ status: "upcoming", pageSize: 50 }),
    getMatches({ status: "finished", pageSize: 6 }),
    getLiveMatches(),
  ]);
  const matches = upcoming?.items ?? [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <LiveRefresher />
      <Breadcrumbs
        items={[{ label: tc("home"), href: "/" }, { label: t("title") }]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-[var(--muted-foreground)]">{t("description")}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/posiciones" className="rounded-full border border-[var(--accent)] px-3.5 py-1.5 transition-colors hover:bg-[var(--muted)]">{t("competitions")}</Link>
          <Link
            href="/partidos/resultados"
            className="rounded-full border border-[var(--border)] px-3.5 py-1.5 transition-colors hover:border-[var(--accent)]"
          >
            {t("seeResults")}
          </Link>
          <Link
            href="/partidos/fixture"
            className="rounded-full border border-[var(--border)] px-3.5 py-1.5 transition-colors hover:border-[var(--accent)]"
          >
            {t("seeFixture")}
          </Link>
        </div>
      </header>

      {live?.length ? <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{t("live")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{live.map((match) => <MatchCard key={match.id} match={match} locale={locale} linked />)}</div>
      </section> : null}

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{t("upcoming")}</h2>
        {matches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} locale={locale} linked />
            ))}
          </div>
        ) : (
          <EmptyState title={t("upcomingEmpty")} />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{t("resultsTitle")}</h2>
          <Link href="/partidos/resultados" className="text-sm font-medium text-[var(--accent)] hover:underline">{t("seeResults")}</Link>
        </div>
        {results?.items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.items.map((match) => <MatchCard key={match.id} match={match} locale={locale} linked />)}</div> : <EmptyState title={t("resultsEmpty")} />}
      </section>
    </main>
  );
}
