import { Wordmark } from "@/components/ui/Wordmark";

type BrandMarkProps = {
  withWordmark?: boolean;
  compactOnMobile?: boolean;
  className?: string;
};

/**
 * Site brand mark. Renders the logo asset at `public/brand/logo.svg` — replace
 * that single file to swap the emblem (a monogram ships by default). The
 * "unofficial" disclaimer in the global Footer must always remain visible.
 */
export function BrandMark({ withWordmark = true, compactOnMobile = false, className }: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.svg"
        alt="Azul y Oro"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md object-contain"
      />
      {withWordmark && <span className={compactOnMobile ? "hidden sm:inline-flex" : "inline-flex"}><Wordmark /></span>}
    </span>
  );
}
