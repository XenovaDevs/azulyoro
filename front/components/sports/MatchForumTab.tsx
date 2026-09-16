"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPost, getMatchTopic } from "@/lib/api/forum";
import type { ForumPostDto, ForumTopicDetailDto } from "@/lib/api/types";

interface MatchForumTabProps {
  matchId: string;
  locale?: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
}

export function MatchForumTab({
  matchId,
  locale = "es",
  homeTeamName,
  awayTeamName,
}: MatchForumTabProps) {
  const isEs = locale === "es";
  const [topic, setTopic] = useState<ForumTopicDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function fetchTopic() {
      setLoading(true);
      const res = await getMatchTopic(matchId);
      if (active) {
        setTopic(res);
        setLoading(false);
      }
    }
    fetchTopic();
    return () => {
      active = false;
    };
  }, [matchId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic || !content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setUnauthorized(false);
    setSuccess(false);

    const res = await createPost(topic.id, content.trim());
    setSubmitting(false);

    if (!res.ok) {
      if (res.unauthorized) {
        setUnauthorized(true);
      }
      setError(res.error || (isEs ? "Error al publicar tu mensaje." : "Failed to post reply."));
      return;
    }

    if (res.data) {
      const newPost: ForumPostDto = res.data;
      setTopic((prev) =>
        prev
          ? {
              ...prev,
              postsCount: prev.postsCount + 1,
              posts: [...prev.posts, newPost],
            }
          : prev,
      );
    }

    setContent("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header banner with match forum link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-4 shadow-sm">
        <div>
          <h3 className="font-display text-base font-bold text-[var(--foreground)]">
            {isEs ? "Debate del Partido" : "Match Discussion"}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isEs
              ? `Espacio de debate oficial para ${homeTeamName ?? "Local"} vs ${awayTeamName ?? "Visita"}.`
              : `Official discussion thread for ${homeTeamName ?? "Home"} vs ${awayTeamName ?? "Away"}.`}
          </p>
        </div>

        {topic && (
          <Link
            href={`/${locale}/foro/tema/${topic.slug || topic.id}`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            <span>{isEs ? "Ver hilo completo en el Foro" : "Open full thread in Forum"}</span>
            <span>↗</span>
          </Link>
        )}
      </div>

      {/* Direct comment form (User requirement: link/write directly in match detail) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-sm sm:p-5">
        <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-[var(--oro-500)]">
          {isEs ? "Escribir en el foro de este partido" : "Write in this match forum"}
        </h4>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isEs
                ? "¿Qué opinás de las formaciones, cambios o jugadas clave? Escribí tu comentario..."
                : "Share your thoughts on lineups, substitutions, or match highlights..."
            }
            rows={3}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />

          {unauthorized ? (
            <div className="rounded-xl border border-[var(--oro-500)]/40 bg-[var(--oro-500)]/10 p-3.5 sm:p-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <span className="text-base">🔒</span>
                  <span>
                    {isEs
                      ? "Debés iniciar sesión o registrarte para publicar comentarios."
                      : "You must sign in or register to post comments."}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/${locale}/ingresar`}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white hover:opacity-90 transition-opacity text-xs"
                  >
                    {isEs ? "Iniciar Sesión" : "Sign In"}
                  </Link>
                  <Link
                    href={`/${locale}/registrarse`}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-bold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-xs"
                  >
                    {isEs ? "Registrarse" : "Register"}
                  </Link>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-400">
              {error}
            </div>
          ) : null}

          {success && (
            <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-xs text-emerald-400">
              {isEs ? "¡Mensaje publicado con éxito!" : "Message posted successfully!"}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs text-[var(--muted-foreground)]">
              {isEs
                ? "Respetá las normas comunitarias del club."
                : "Follow community guidelines."}
            </span>

            <button
              type="submit"
              disabled={submitting || !content.trim() || !topic}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting
                ? isEs ? "Publicando..." : "Posting..."
                : isEs ? "Publicar Comentario" : "Post Comment"}
            </button>
          </div>
        </form>
      </div>

      {/* Discussion posts list */}
      <div className="flex flex-col gap-3">
        <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {isEs ? "Comentarios de hinchas" : "Fan Comments"} ({topic?.posts?.length ?? 0})
        </h4>

        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
            {isEs ? "Cargando debate del partido..." : "Loading match discussion..."}
          </div>
        ) : !topic || topic.posts.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
            <p className="font-semibold text-sm text-[var(--foreground)] mb-1">
              {isEs ? "Aún no hay comentarios sobre este partido." : "No comments on this match yet."}
            </p>
            <p>
              {isEs ? "¡Sé el primero en dejar tu análisis o pronóstico!" : "Be the first to share your prediction or analysis!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {topic.posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-xs"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white text-[10px]">
                      {(post.authorName || "X")[0].toUpperCase()}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {post.authorName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                    {new Date(post.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
