"use client";

import { useState } from "react";
import Link from "next/link";
import { createPost } from "@/lib/api/forum";
import type { ForumPostDto, ForumTopicDetailDto } from "@/lib/api/types";
import { AdminModerationModal } from "./AdminModerationModal";

interface TopicDiscussionViewProps {
  initialTopic: ForumTopicDetailDto;
  locale?: string;
  userRoles?: string[];
  currentUserId?: string;
}

export function TopicDiscussionView({
  initialTopic,
  locale = "es",
  userRoles = [],
  currentUserId: _currentUserId,
}: TopicDiscussionViewProps) {
  const isEs = locale === "es";
  const isAdmin = userRoles.includes("Admin");

  const [topic, setTopic] = useState<ForumTopicDetailDto>(initialTopic);
  const [content, setContent] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Moderation modal state
  const [modModalUser, setModModalUser] = useState<{ id: string; name: string } | null>(null);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || topic.isLocked) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const res = await createPost(topic.id, content.trim());
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || (isEs ? "Error al publicar la respuesta." : "Failed to post reply."));
      return;
    }

    if (res.data) {
      const newPost: ForumPostDto = res.data;
      setTopic((prev) => ({
        ...prev,
        postsCount: prev.postsCount + 1,
        posts: [...prev.posts, newPost],
      }));
    }

    setContent("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Original Topic Post Card */}
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white text-xs">
              {(topic.authorName || "X")[0].toUpperCase()}
            </span>
            <div>
              <span className="font-bold text-[var(--foreground)]">{topic.authorName}</span>
              <span className="ml-2 text-[var(--muted-foreground)]">
                {new Date(topic.createdAt).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--muted)] px-2 py-0.5 font-semibold text-[var(--oro-500)] text-[10px] uppercase">
              {topic.categoryName}
            </span>
            {isAdmin && topic.authorId && topic.authorId !== "00000000-0000-0000-0000-000000000000" && (
              <button
                type="button"
                onClick={() => setModModalUser({ id: topic.authorId, name: topic.authorName })}
                className="cursor-pointer rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                title={isEs ? "Moderar autor (suspender o banear)" : "Moderate author"}
              >
                🛡️ {isEs ? "Moderar" : "Moderate"}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
          {topic.content}
        </div>
      </article>

      {/* Linked Match Reminder Banner */}
      {topic.matchId && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <span>⚽</span>
            <span>
              {isEs ? "Este tema está vinculado al partido:" : "This thread is linked to match:"}{" "}
              <strong>{topic.matchLabel || (isEs ? "Partido Oficial" : "Official Match")}</strong>
            </span>
          </div>
          <Link
            href={`/${locale}/partidos`}
            className="font-bold text-emerald-400 hover:underline"
          >
            {isEs ? "Ver Partido →" : "View Match →"}
          </Link>
        </div>
      )}

      {/* Replies List */}
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base font-bold text-[var(--foreground)]">
          {isEs ? "Respuestas de la Comunidad" : "Community Replies"} ({topic.posts.length})
        </h3>

        {topic.posts.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
            {isEs
              ? "Todavía no hay respuestas. ¡Sé el primero en aportar al debate!"
              : "No replies yet. Be the first to contribute to this discussion!"}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topic.posts.map((post, index) => (
              <div
                key={post.id || index}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted)] font-bold text-[var(--foreground)] text-[10px]">
                      {(post.authorName || "X")[0].toUpperCase()}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {post.authorName}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                      #{index + 1} · {new Date(post.createdAt).toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isAdmin && post.authorId && (
                    <button
                      type="button"
                      onClick={() => setModModalUser({ id: post.authorId, name: post.authorName })}
                      className="cursor-pointer rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      title={isEs ? "Suspender o banear a este usuario" : "Moderate user"}
                    >
                      🛡️ {isEs ? "Moderar" : "Moderate"}
                    </button>
                  )}
                </div>

                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed pl-8">
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reply Form */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-[var(--oro-500)]">
          {isEs ? "Dejar tu Respuesta" : "Leave a Reply"}
        </h3>

        {topic.isLocked ? (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400">
            🔒 {isEs ? "Este tema se encuentra cerrado para nuevas respuestas." : "This topic is locked for replies."}
          </div>
        ) : (
          <form onSubmit={handleReply} className="flex flex-col gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isEs
                  ? "Escribí tu opinión con respeto a la comunidad xeneize..."
                  : "Share your thoughts respecting the community guidelines..."
              }
              rows={3}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />

            {error && (
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-400">
                {isEs ? "¡Respuesta publicada con éxito!" : "Reply posted successfully!"}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[var(--muted-foreground)]">
                {isEs ? "Participá cumpliendo las normas del foro." : "Follow community rules."}
              </span>

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="cursor-pointer rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting
                  ? (isEs ? "Enviando..." : "Posting...")
                  : (isEs ? "Publicar Respuesta" : "Post Reply")}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Admin Moderation Modal */}
      {modModalUser && (
        <AdminModerationModal
          userId={modModalUser.id}
          userName={modModalUser.name}
          isOpen={true}
          locale={locale}
          onClose={() => setModModalUser(null)}
          onModerated={() => setModModalUser(null)}
        />
      )}
    </div>
  );
}
