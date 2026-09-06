import type { ReactNode } from "react";

/** Centered narrow container for auth + newsletter forms. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8 [overflow-wrap:anywhere] sm:py-16">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        )}
      </header>
      <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
        {children}
      </div>
      {footer && (
        <p className="text-center text-sm text-[var(--muted-foreground)]">{footer}</p>
      )}
    </main>
  );
}
