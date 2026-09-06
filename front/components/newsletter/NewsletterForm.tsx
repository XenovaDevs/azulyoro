"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

export function NewsletterForm() {
  const t = useTranslations("Newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false); // unchecked by default (explicit consent)
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!optIn) {
      setError(t("optInRequired"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      // The API always returns 200 (anti-enumeration) → show the DOI state.
      if (res.ok) {
        setDone(true);
        return;
      }
      setDone(true); // anti-enumeration: still show the neutral DOI state
    } catch {
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="font-display text-lg font-semibold">{t("checkEmailTitle")}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{t("checkEmailBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      <Field
        id="newsletter-email"
        type="email"
        label={t("email")}
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-[var(--muted-foreground)]">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span>{t("optIn")}</span>
      </label>
      <Button type="submit" pending={pending}>
        {pending ? t("subscribing") : t("subscribe")}
      </Button>
    </form>
  );
}
