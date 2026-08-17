import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BomboneraLoader } from "@/components/bombonera/BomboneraLoader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Bombonera" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BomboneraPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Bombonera");

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] lg:items-end">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-bold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
        </div>
        <div className="border-l-2 border-[var(--oro-500)] pl-4">
          <p className="text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
            {t("description")}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("unofficial")}
          </p>
        </div>
      </header>

      <BomboneraLoader />

      <section
        aria-labelledby="bombonera-sources"
        className="grid gap-4 border-t border-white/10 pt-6 lg:grid-cols-[minmax(12rem,0.45fr)_minmax(0,1fr)]"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            {t("sourcesEyebrow")}
          </p>
          <h2 id="bombonera-sources" className="mt-2 font-display text-2xl font-bold">
            {t("sourcesTitle")}
          </h2>
        </div>
        <div>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {t("sourcesDescription")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              [
                t("sources.upv"),
                "https://riunet.upv.es/handle/10251/231037",
              ],
              [
                t("sources.osm"),
                "https://www.openstreetmap.org/way/248598885",
              ],
              [t("sources.works"), "https://www.bocajuniors.com.ar/obras"],
              [
                t("sources.aerials"),
                "https://commons.wikimedia.org/wiki/Category:Aerial_photographs_of_La_Bombonera_in_2025",
              ],
              [
                t("sources.model"),
                "https://sketchfab.com/3d-models/la-bombonera-boca-juniors-82204c5963b84ac593c26127ac36fbfa",
              ],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  className="inline-flex min-h-9 items-center rounded-full border border-white/15 px-3 text-[var(--muted-foreground)] transition hover:border-[var(--oro-500)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--oro-500)]"
                  href={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
