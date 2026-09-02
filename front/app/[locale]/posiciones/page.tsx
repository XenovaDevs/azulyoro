import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStandings } from "@/lib/api/sports";
import { StandingsFilterView } from "@/components/sports/StandingsFilterView";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Standings" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Standings");
  const tc = await getTranslations("Common");

  const standings = await getStandings();
  const rows = standings ?? [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 sm:gap-8 px-3 sm:px-4 py-6 sm:py-10">
      <Breadcrumbs
        items={[{ label: tc("home"), href: "/" }, { label: t("title") }]}
      />

      <header className="flex flex-col gap-1.5 sm:gap-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)]">{t("description")}</p>
      </header>

      {rows.length > 0 ? (
        <StandingsFilterView standings={rows} locale={locale} />
      ) : (
        <EmptyState title={t("empty")} />
      )}
    </main>
  );
}
