import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type LinkHref = ComponentProps<typeof Link>["href"];

export interface BreadcrumbItem {
  label: string;
  /** Internal key path (e.g. "/partidos"); omit for the current page. */
  href?: LinkHref;
}

/**
 * Accessible breadcrumb navigation. Also emits BreadcrumbList JSON-LD.
 * The last item is treated as the current page (aria-current, no link).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const t = useTranslations("Common");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(typeof item.href === "string" ? { item: item.href } : {}),
    })),
  };

  return (
    <nav aria-label={t("breadcrumb")} className="text-sm text-[var(--muted-foreground)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-[var(--foreground)]" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-[var(--border)]">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
