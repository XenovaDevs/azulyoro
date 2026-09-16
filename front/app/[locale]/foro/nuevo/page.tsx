"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createTopic, getForumCategories } from "@/lib/api/forum";
import type { ForumCategoryDto } from "@/lib/api/types";
import { Breadcrumbs } from "@/components/sports/Breadcrumbs";

export default function CreateTopicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategoryId = searchParams.get("categoryId") || "";

  const isEs = locale === "es";

  const [categories, setCategories] = useState<ForumCategoryDto[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(true);

  const [categoryId, setCategoryId] = useState<string>(preselectedCategoryId);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCats() {
      setLoadingCats(true);
      const list = await getForumCategories();
      if (active) {
        setCategories(list);
        if (!categoryId && list.length > 0) {
          setCategoryId(preselectedCategoryId || list[0].id);
        }
        setLoadingCats(false);
      }
    }
    loadCats();
    return () => {
      active = false;
    };
  }, [categoryId, preselectedCategoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const res = await createTopic({
      categoryId,
      title: title.trim(),
      content: content.trim(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || (isEs ? "Error al crear el tema." : "Failed to create topic."));
      return;
    }

    if (res.data?.slug || res.data?.id) {
      router.push(`/${locale}/foro/tema/${res.data.slug || res.data.id}`);
    } else {
      router.push(`/${locale}/foro`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: isEs ? "Inicio" : "Home", href: "/" },
          { label: isEs ? "Foro" : "Forum", href: "/foro" },
          { label: isEs ? "Crear Nuevo Tema" : "New Topic" },
        ]}
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 font-display text-2xl font-bold text-[var(--foreground)]">
          {isEs ? "Iniciar Nuevo Debate" : "Start New Topic"}
        </h1>
        <p className="mb-6 text-xs sm:text-sm text-[var(--muted-foreground)]">
          {isEs
            ? "Compartí tu análisis, opinión o consulta con la comunidad xeneize."
            : "Share your thoughts, analysis, or question with the Boca Juniors community."}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-4 text-xs sm:text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {isEs ? "Categoría" : "Category"}
            </label>
            {loadingCats ? (
              <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--muted)]" />
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {isEs ? "Título del Tema" : "Topic Title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEs ? "Ej: ¿Qué esquema táctico conviene para el próximo superclásico?" : "Topic title..."}
              minLength={4}
              maxLength={200}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {isEs ? "Contenido / Argumento inicial" : "Content"}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isEs ? "Desarrollá tu planteo, datos, sensaciones..." : "Develop your argument..."}
              rows={6}
              minLength={10}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href={`/${locale}/foro`}
              className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {isEs ? "← Cancelar" : "← Cancel"}
            </Link>

            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="cursor-pointer rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting
                ? (isEs ? "Publicando tema..." : "Creating topic...")
                : (isEs ? "Publicar Tema" : "Publish Topic")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
