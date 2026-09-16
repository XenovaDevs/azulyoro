import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getForumTopicDetail } from "@/lib/api/forum";
import { getMe } from "@/lib/api/auth";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";
import { TopicDiscussionView } from "@/components/forum/TopicDiscussionView";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const topic = await getForumTopicDetail(id);
  if (!topic) return {};
  return {
    title: `${topic.title} — Azul y Oro Foro`,
    description: topic.content.slice(0, 160),
  };
}

export default async function ForumTopicDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tc = await getTranslations("Common");
  const isEs = locale === "es";

  const [topic, me] = await Promise.all([
    getForumTopicDetail(id),
    getMe().catch(() => null),
  ]);

  if (!topic) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tc("home"), href: "/" },
          { label: isEs ? "Foro" : "Forum", href: "/foro" },
          {
            label: topic.categoryName,
            href: {
              pathname: "/foro/categoria/[slug]",
              params: { slug: topic.categorySlug },
            },
          },
          { label: topic.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[var(--muted)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--oro-500)]">
            {topic.categoryName}
          </span>
          {topic.isPinned && (
            <span className="rounded bg-amber-500/15 text-amber-300 px-2 py-0.5 text-xs font-bold">
              📌 {isEs ? "Fijado" : "Pinned"}
            </span>
          )}
          {topic.isLocked && (
            <span className="rounded bg-rose-500/15 text-rose-400 px-2 py-0.5 text-xs font-bold">
              🔒 {isEs ? "Cerrado" : "Locked"}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-[var(--foreground)]">
          {topic.title}
        </h1>
      </div>

      <TopicDiscussionView
        initialTopic={topic}
        locale={locale}
        userRoles={me?.roles ?? []}
        currentUserId={undefined}
      />
    </main>
  );
}
