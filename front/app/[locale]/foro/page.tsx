import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getForumCategories, getForumTopics } from "@/lib/api/forum";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";

export const revalidate = 15;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === "es";
  return {
    title: isEs ? "Foro de Hinchas — Azul y Oro" : "Fan Forum — Azul y Oro",
    description: isEs
      ? "Comunidad de debate de Boca Juniors. Partidos, mercado de pases, alineaciones y actualidad del club."
      : "Boca Juniors fan community and discussion boards. Matches, transfers, lineups and club news.",
  };
}

export default async function ForumHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("Common");
  const isEs = locale === "es";

  const [categories, recentTopics] = await Promise.all([
    getForumCategories(),
    getForumTopics({ page: 1 }),
  ]);

  const categoryIcons: Record<string, string> = {
    partidos: "🛡️",
    general: "💬",
    mercado: "🔄",
    bombonera: "🏟️",
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: isEs ? "Foro" : "Forum" },
        ]}
      />

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--azul-900)] via-[var(--card)] to-[var(--card)] p-6 shadow-md">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--oro-500)]">
            {isEs ? "Comunidad Xeneize" : "Xeneize Community"}
          </span>
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
            {isEs ? "Foro Azul y Oro" : "Azul y Oro Forum"}
          </h1>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-[var(--muted-foreground)]">
            {isEs
              ? "El punto de encuentro para debatir partidos, alineaciones, pases, socios y la pasión por Boca Juniors."
              : "The gathering place to discuss matches, lineups, transfers, members, and passion for Boca Juniors."}
          </p>
        </div>

        <Link
          href={`/${locale}/foro/nuevo`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 shrink-0"
        >
          <span>✍️</span>
          <span>{isEs ? "Crear Nuevo Tema" : "Start New Topic"}</span>
        </Link>
      </div>

      {/* Categories Grid */}
      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-[var(--foreground)]">
          {isEs ? "Categorías de Debate" : "Discussion Categories"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/foro/categoria/${cat.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs transition-all hover:border-[var(--accent)] hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{categoryIcons[cat.slug] || "⚽"}</span>
                  <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--muted-foreground)]">
                    {cat.topicsCount} {isEs ? "temas" : "topics"}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
                  {cat.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted-foreground)]">
                <span>{cat.postsCount} {isEs ? "mensajes" : "posts"}</span>
                <span className="font-semibold text-[var(--accent)]">Ver categoría →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Discussion Topics */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
            {isEs ? "Temas Recientes y Actividad" : "Recent Topics & Activity"}
          </h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            {recentTopics.total} {isEs ? "debates registrados" : "discussions"}
          </span>
        </div>

        {recentTopics.items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted-foreground)]">
            <p className="text-base font-bold text-[var(--foreground)] mb-1">
              {isEs ? "Aún no se han abierto temas en el foro." : "No forum topics yet."}
            </p>
            <p className="mb-4">
              {isEs ? "Sé el primero en iniciar un debate de Boca Juniors." : "Be the first to start a Boca Juniors discussion."}
            </p>
            <Link
              href={`/${locale}/foro/nuevo`}
              className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
            >
              {isEs ? "Abrir primer tema" : "Open first topic"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
            {recentTopics.items.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">
                    {topic.isPinned ? "📌" : categoryIcons[topic.categorySlug] || "💬"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--oro-500)] uppercase tracking-wider">
                        {topic.categoryName}
                      </span>
                      {topic.matchId && (
                        <span className="rounded bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 text-[10px] font-semibold border border-emerald-500/25">
                          ⚽ {isEs ? "Partido" : "Match"}
                        </span>
                      )}
                      {topic.isLocked && (
                        <span className="rounded bg-rose-500/15 text-rose-400 px-1.5 py-0.2 text-[10px] font-semibold">
                          🔒 {isEs ? "Cerrado" : "Locked"}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/${locale}/foro/tema/${topic.slug || topic.id}`}
                      className="font-display text-sm sm:text-base font-bold text-[var(--foreground)] hover:text-[var(--accent)] line-clamp-1 transition-colors"
                    >
                      {topic.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>{isEs ? "Por" : "By"} <strong className="text-[var(--foreground)]">{topic.authorName}</strong></span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {new Date(topic.createdAt).toLocaleDateString(locale, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4 text-xs text-[var(--muted-foreground)] pl-8 sm:pl-0">
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span className="tabular-nums font-bold text-[var(--foreground)]">{topic.postsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👁️</span>
                    <span className="tabular-nums">{topic.viewsCount}</span>
                  </div>
                  <Link
                    href={`/${locale}/foro/tema/${topic.slug || topic.id}`}
                    className="rounded-lg bg-[var(--muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                  >
                    {isEs ? "Ver" : "View"} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
