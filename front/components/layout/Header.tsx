import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

const NAV = [
  { href: "/partidos", key: "matches" },
  { href: "/plantel", key: "squad" },
  { href: "/posiciones", key: "standings" },
  { href: "/noticias", key: "news" },
  { href: "/fichajes", key: "transfers" },
  { href: "/bombonera", key: "stadium" },
] as const;

export function Header() {
  const t = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_90%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-xl" aria-label="Azul y Oro">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-medium lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/en-vivo"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--live)_45%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--live)]"
          >
            <span
              className="h-2 w-2 rounded-full bg-[var(--live)] motion-safe:animate-pulse"
              aria-hidden
            />
            {t("live")}
          </Link>
          <LocaleSwitcher />
          <Link
            href="/ingresar"
            className="rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
