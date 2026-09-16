"use client";

import { useState } from "react";
import { moderateUser } from "@/lib/api/forum";

interface AdminModerationModalProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onModerated?: () => void;
  locale?: string;
}

export function AdminModerationModal({
  userId,
  userName,
  isOpen,
  onClose,
  onModerated,
  locale = "es",
}: AdminModerationModalProps) {
  const isEs = locale === "es";
  const [action, setAction] = useState<"suspend" | "ban" | "unban">("suspend");
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  async function handleModerate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const res = await moderateUser({
      userId,
      action,
      days: action === "suspend" ? days : undefined,
      reason: reason.trim() || (action === "ban" ? "Ban permanente por incumplimiento" : "Suspensión temporal"),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || (isEs ? "Error al moderar usuario." : "Failed to moderate user."));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onClose();
      onModerated?.();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="font-display text-base font-bold text-rose-500 flex items-center gap-2">
            <span>🛡️</span>
            <span>{isEs ? "Moderar Usuario" : "Moderate User"}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          {isEs ? "Aplicar sanción disciplinaria al usuario:" : "Apply disciplinary action to user:"}{" "}
          <strong className="text-[var(--foreground)]">{userName}</strong>
        </p>

        <form onSubmit={handleModerate} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--foreground)]">
              {isEs ? "Acción de moderación" : "Moderation Action"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction("suspend")}
                className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors ${
                  action === "suspend"
                    ? "bg-amber-500 text-black shadow-xs"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {isEs ? "Suspender" : "Suspend"}
              </button>
              <button
                type="button"
                onClick={() => setAction("ban")}
                className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors ${
                  action === "ban"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {isEs ? "Permaban" : "Permaban"}
              </button>
              <button
                type="button"
                onClick={() => setAction("unban")}
                className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors ${
                  action === "unban"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {isEs ? "Quitar Sanción" : "Unban"}
              </button>
            </div>
          </div>

          {action === "suspend" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--foreground)]">
                {isEs ? "Duración de la suspensión" : "Suspension Duration"}
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-xs text-[var(--foreground)]"
              >
                <option value={1}>1 {isEs ? "día" : "day"}</option>
                <option value={3}>3 {isEs ? "días" : "days"}</option>
                <option value={7}>7 {isEs ? "días (1 semana)" : "days (1 week)"}</option>
                <option value={15}>15 {isEs ? "días" : "days"}</option>
                <option value={30}>30 {isEs ? "días (1 mes)" : "days (1 month)"}</option>
                <option value={90}>90 {isEs ? "días (3 meses)" : "days (3 months)"}</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--foreground)]">
              {isEs ? "Motivo de la sanción (visible para el usuario)" : "Reason"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEs ? "Faltas de respeto, spam, lenguaje ofensivo..." : "Offensive language, spam..."}
              rows={2}
              required={action !== "unban"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-xs text-[var(--foreground)]"
            />
          </div>

          {error && (
            <div className="rounded-md bg-rose-500/15 border border-rose-500/30 p-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 p-2 text-xs text-emerald-400">
              {isEs ? "Sanción aplicada exitosamente." : "Action applied successfully."}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {isEs ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? (isEs ? "Aplicando..." : "Applying...") : (isEs ? "Confirmar Sanción" : "Confirm Action")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
