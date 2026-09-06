import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/api/auth";
import "../globals.css";

export const metadata: Metadata = {
  title: "CMS · Azul y Oro",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mePromise = getMe();

  return <AdminGate mePromise={mePromise}>{children}</AdminGate>;
}

async function AdminGate({
  mePromise,
  children,
}: {
  mePromise: ReturnType<typeof getMe>;
  children: React.ReactNode;
}) {
  const me = await mePromise;
  if (!me || !me.roles.includes("Admin")) {
    redirect("/es/ingresar");
  }

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/admin/moderacion" className="inline-flex min-h-11 items-center font-display text-xl font-bold">
              CMS Azul y Oro
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/moderacion"
                className="inline-flex min-h-11 items-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Moderación
              </Link>
            </nav>
          </div>
        </header>

        <div
          role="alert"
          className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:text-amber-300"
        >
          Área admin — acceso restringido a usuarios con rol Admin
        </div>

        <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 [overflow-wrap:anywhere]">{children}</main>
      </body>
    </html>
  );
}
