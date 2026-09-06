import { revalidatePath } from "next/cache";
import { updateArticle, publishArticle } from "@/lib/api/admin";
import type { ArticleCategory, UpdateArticleInput } from "@/lib/api/types";

export const dynamic = "force-dynamic";

const CATEGORIES: ArticleCategory[] = ["News", "Rumor", "Editorial"];

function translationFrom(fd: FormData, loc: "es" | "en") {
  return {
    title: String(fd.get(`${loc}.title`) ?? ""),
    summary: String(fd.get(`${loc}.summary`) ?? ""),
    bodyHtml: String(fd.get(`${loc}.bodyHtml`) ?? ""),
    metaTitle: String(fd.get(`${loc}.metaTitle`) ?? ""),
    metaDescription: String(fd.get(`${loc}.metaDescription`) ?? ""),
  };
}

function inputFrom(fd: FormData): UpdateArticleInput {
  return {
    translations: {
      es: translationFrom(fd, "es"),
      en: translationFrom(fd, "en"),
    },
    category: String(fd.get("category") ?? "News") as ArticleCategory,
    coverImageUrl: String(fd.get("coverImageUrl") ?? ""),
    isMembersOnly: fd.get("isMembersOnly") === "on",
  };
}

function Field({
  label,
  name,
  required,
  textarea,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {required ? " (*)" : ""}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          rows={8}
          defaultValue={defaultValue}
          className="min-h-11 w-full min-w-0 resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-base sm:text-sm"
        />
      ) : (
        <input
          name={name}
          required={required}
          defaultValue={defaultValue}
          className="min-h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base sm:text-sm"
        />
      )}
    </label>
  );
}

function LocaleColumn({ loc, title }: { loc: "es" | "en"; title: string }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <legend className="px-2 font-display text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        {title}
      </legend>
      <Field label="Título" name={`${loc}.title`} required />
      <Field label="Resumen" name={`${loc}.summary`} required />
      <Field label="Cuerpo (HTML)" name={`${loc}.bodyHtml`} required textarea />
      <Field label="Meta título" name={`${loc}.metaTitle`} />
      <Field label="Meta descripción" name={`${loc}.metaDescription`} />
    </fieldset>
  );
}

export default async function ArticleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  async function saveAction(formData: FormData) {
    "use server";
    await updateArticle(id, inputFrom(formData));
    revalidatePath(`/admin/articulos/${id}`);
  }

  async function publishAction(formData: FormData) {
    "use server";
    // Persist current edits before publishing.
    await updateArticle(id, inputFrom(formData));
    await publishArticle(id);
    revalidatePath(`/admin/articulos/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">Editar artículo</h1>
        <p className="font-mono text-xs text-[var(--muted-foreground)]">
          {id.replaceAll("-", "").slice(0, 6).toUpperCase()}
        </p>
      </header>

      <form className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <LocaleColumn loc="es" title="Español" />
          <LocaleColumn loc="en" title="English" />
        </div>

        <div className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="font-medium">Categoría (*)</span>
            <select
              name="category"
              defaultValue="News"
              className="min-h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base sm:text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="font-medium">URL de portada</span>
            <input
              name="coverImageUrl"
              type="url"
              className="min-h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base sm:text-sm"
            />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm sm:col-span-2">
            <input name="isMembersOnly" type="checkbox" className="h-5 w-5 shrink-0" />
            <span className="font-medium">Solo para socios</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            formAction={saveAction}
            className="min-h-11 rounded-md border border-[var(--border)] px-5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--muted)]"
          >
            Guardar
          </button>
          <button
            type="submit"
            formAction={publishAction}
            className="min-h-11 rounded-md bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
