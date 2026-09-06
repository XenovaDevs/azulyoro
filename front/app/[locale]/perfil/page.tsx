import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getMe } from "@/lib/api/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("metaTitle"), description: t("description") };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  const me = await getMe();
  if (!me) {
    redirect({ href: "/ingresar", locale });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-[var(--muted-foreground)]">{t("description")}</p>
      </header>

      <dl className="grid min-w-0 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 [overflow-wrap:anywhere] sm:p-6">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("email")}
          </dt>
          <dd className="font-medium">{me!.email}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("displayName")}
          </dt>
          <dd className="font-medium">{me!.displayName || t("noName")}</dd>
        </div>
        {me!.roles.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              {t("roles")}
            </dt>
            <dd className="flex flex-wrap gap-2">
              {me!.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium"
                >
                  {r}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          // `/socios` is served as a same-segment route in both locales (it is
          // not in the localized pathnames map); Link still prefixes the locale.
          href={"/socios" as React.ComponentProps<typeof Link>["href"]}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-center text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          {t("membersCta")}
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
