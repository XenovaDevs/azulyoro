"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While a match is live, periodically re-render the server component via
 * router.refresh() so the score/events update in-page. Uses the Next server
 * (no direct browser→API call), so there is no CORS concern.
 */
export function LiveRefresher({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);
  return null;
}
