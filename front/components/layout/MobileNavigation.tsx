"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

export function MobileNavigation({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname();
  return <details key={pathname} className="group border-t border-[var(--border)] lg:hidden" onKeyDown={event => {
    if (event.key === "Escape") {
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus();
    }
  }}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] [&::-webkit-details-marker]:hidden">
      <span>{label}</span>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    <nav aria-label={label} className="grid max-h-[60svh] grid-cols-2 gap-1 overflow-y-auto px-3 pb-3 sm:grid-cols-3" onClick={event => {
      if (event.target instanceof Element && event.target.closest("a")) {
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
      }
    }}>{children}</nav>
  </details>;
}
