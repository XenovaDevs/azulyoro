import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCategoryBySlug } from "@/lib/api/forum";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";

export const revalidate = 15;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCategoryBySlug(slug);
  if (!data) return {};
  const isEs = locale === "es";
  return {
    title: `${data.category.name} — ${isEs ? "Foro Azul y Oro" : "Forum Azul y Oro"}`,
    description: data.category.description ?? undefined,
  };
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("Common");
  const isEs = locale === "es";

  const data = await getCategoryBySlug(slug);
  if (!data) notFound();

  const { category, topics, total } = data;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: isEs ? "Foro" : "Forum", href: "/foro" },
          { label: category.name },
        ]}
      />

      {/* Category Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--oro-500)]">
            {isEs ? "Categoría del Foro" : "Forum Category"}
          </span>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-xl">
              {category.description}
            </p>
          )}
        </div>

        <Link
          href={`/${locale}/foro/nuevo?categoryId=${category.id}`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:opacity-90 shrink-0"
        >
          <span>✍️</span>
          <span>{isEs ? "Nuevo Tema" : "New Topic"}</span>
        </Link>
      </div>

      {/* Topics list */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] px-1">
          <span>{total} {isEs ? "temas de debate" : "topics"}</span>
          <span>{isEs ? "Ordenados por actividad reciente" : "Sorted by recent activity"}</span>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-sm text-[var(--muted-foreground)]">
            <p className="font-bold text-base text-[var(--foreground)] mb-1">
              {isEs ? "Aún no hay debates en esta categoría." : "No discussions in this category yet."}
            </p>
            <p className="mb-4 text-xs">
              {isEs ? "Sé el primero en iniciar una conversación." : "Be the first to start a conversation."}
            </p>
            <Link
              href={`/${locale}/foro/nuevo?categoryId=${category.id}`}
              className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
            >
              {isEs ? "Crear primer tema" : "Create first topic"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">
                    {topic.isPinned ? "📌" : "💬"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
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
