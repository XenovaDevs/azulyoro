import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getModerationQueue, approveModeration, rejectModeration } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

async function approveAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const { articleId } = await approveModeration(id);
  revalidatePath("/admin/moderacion");
  redirect(`/admin/articulos/${articleId}`);
}

async function rejectAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await rejectModeration(id);
  revalidatePath("/admin/moderacion");
}

export default async function ModerationPage() {
  const items = await getModerationQueue("Pending");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">Moderación de contenido</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {items.length} elemento{items.length === 1 ? "" : "s"} pendiente
          {items.length === 1 ? "" : "s"} de revisión.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] px-6 py-12 text-center text-[var(--muted-foreground)]">
          No hay elementos pendientes.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span className="rounded bg-[var(--muted)] px-2 py-0.5 font-mono uppercase">
                  {item.id.replaceAll("-", "").slice(0, 6).toUpperCase()}
                </span>
                <span className="rounded bg-[var(--muted)] px-2 py-0.5 uppercase">
                  {item.category}
                </span>
                {item.sourceName && (
                  <span>
                    Fuente:{" "}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="nofollow noopener"
                        className="text-[var(--accent)] underline"
                      >
                        {item.sourceName}
                      </a>
                    ) : (
                      item.sourceName
                    )}
                  </span>
                )}
              </div>

              <h2 className="font-display text-lg font-semibold">{item.title}</h2>

              {item.excerpt && (
                <p className="text-sm text-[var(--muted-foreground)]">{item.excerpt}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <form action={approveAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="min-h-11 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                  >
                    Aprobar
                  </button>
                </form>
                <form action={rejectAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="min-h-11 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--muted)]"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
