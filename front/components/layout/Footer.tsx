import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { UnofficialDisclaimer } from "@/components/ui/UnofficialDisclaimer";

const LEGAL = [
  { href: "/terminos", key: "terms" },
  { href: "/privacidad", key: "privacy" },
  { href: "/aviso-legal", key: "legalNotice" },
  { href: "/cookies", key: "cookies" },
] as const;

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Azul y Oro">
            <Wordmark />
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
            {LEGAL.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <UnofficialDisclaimer />

        <p className="text-xs text-[var(--muted-foreground)]">
          {t("dataAttribution")}
        </p>
      </div>
    </footer>
  );
}
