"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName, locale, optIn }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      setError(t("genericError"));
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="font-display text-lg font-semibold">
          {t("registerCheckEmailTitle")}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("registerCheckEmailBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      <Field
        id="email"
        type="email"
        label={t("email")}
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        id="password"
        type="password"
        label={t("password")}
        required
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        id="displayName"
        type="text"
        label={t("displayName")}
        placeholder={t("displayNamePlaceholder")}
        autoComplete="nickname"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
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
        {pending ? t("registering") : t("submitRegister")}
      </Button>
    </form>
  );
}
