"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormMessage } from "@/components/ui/FormMessage";

type State = "loading" | "success" | "error" | "missing";

export function VerifyEmailClient({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const t = useTranslations("Auth");
  const [state, setState] = useState<State>(token && email ? "loading" : "missing");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token || !email) return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, email }),
        });
        setState(res.ok ? "success" : "error");
      } catch {
        setState("error");
      }
    })();
  }, [token, email]);

  return (
    <div className="flex flex-col gap-4">
      {state === "loading" && <FormMessage variant="info">{t("verifying")}</FormMessage>}
      {state === "success" && (
        <FormMessage variant="success">{t("verifySuccess")}</FormMessage>
      )}
      {state === "error" && <FormMessage variant="error">{t("verifyError")}</FormMessage>}
      {state === "missing" && (
        <FormMessage variant="error">{t("verifyMissing")}</FormMessage>
      )}

      {state !== "loading" && (
        <Link
          href="/ingresar"
          className="inline-flex min-h-11 items-center justify-center text-center text-sm font-semibold text-[var(--primary)]"
        >
          {t("goToLogin")}
        </Link>
      )}
    </div>
  );
}
