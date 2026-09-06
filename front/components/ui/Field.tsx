import type { InputHTMLAttributes, ReactNode } from "react";

/** Label + input pair. Required fields render a `(*)` marker per the UI rules. */
export function Field({
  id,
  label,
  required,
  hint,
  children,
  ...input
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--live)]" aria-hidden>
            {" "}
            (*)
          </span>
        )}
      </label>
      {children ?? (
        <input
          id={id}
          required={required}
          aria-required={required}
          className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-base outline-none transition-colors focus:border-[var(--primary)] sm:text-sm"
          {...input}
        />
      )}
      {hint && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}
