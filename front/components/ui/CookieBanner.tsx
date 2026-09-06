"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const STORAGE_KEY = "azulyoro.cookie-notice";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function getServerDismissed() {
  return false;
}

/**
 * Minimal, dismissible cookie notice. Plausible is cookieless and we set no
 * non-essential cookies, so this is informational only — dismissal is stored
 * in localStorage (not a cookie). Rendered inside the [locale] layout body.
 */
export function CookieBanner() {
  const t = useTranslations("Cookies");
  const dismissed = useSyncExternalStore(subscribe, getDismissed, getServerDismissed);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      /* ignore storage errors */
    }
    window.dispatchEvent(new Event("storage"));
  }

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[50svh] overflow-y-auto border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,transparent)] px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("bannerText")}{" "}
          <Link href="/cookies" className="font-semibold text-[var(--primary)] underline">
            {t("bannerLink")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 shrink-0 cursor-pointer rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          {t("bannerAccept")}
        </button>
      </div>
    </div>
  );
}
