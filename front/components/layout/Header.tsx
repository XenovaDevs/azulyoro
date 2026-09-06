import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { MobileNavigation } from "./MobileNavigation";

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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-2 py-2 sm:gap-6 sm:px-4 sm:py-3">
        <Link href="/" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-xl" aria-label="Azul y Oro">
          <BrandMark compactOnMobile />
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-4 text-sm font-medium lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/en-vivo"
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color-mix(in_oklab,var(--live)_45%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--live)] sm:px-2.5"
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
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-[var(--primary)] px-2 py-1.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 sm:px-3.5"
          >
            {t("login")}
          </Link>
        </div>
      </div>
      <MobileNavigation label={t("menu")}>
        {NAV.map(item => <Link key={item.href} href={item.href} className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{t(item.key)}</Link>)}
      </MobileNavigation>
    </header>
  );
}
