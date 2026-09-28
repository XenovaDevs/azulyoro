import Image from "next/image";

type BrandMarkProps = {
  compactOnMobile?: boolean;
  className?: string;
};

/** Supplied brand artwork, with a compact emblem for narrow navigation. */
export function BrandMark({ compactOnMobile = false, className }: BrandMarkProps) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className ?? ""}`} role="img" aria-label="Azul y Oro">
      {compactOnMobile && (
        <span className="inline-flex sm:hidden">
          <Image src="/brand/icon-blue.png" alt="" width={40} height={40} className="brand-light h-10 w-10" />
          <Image src="/brand/icon-gold.png" alt="" width={40} height={40} className="brand-dark h-10 w-10" />
        </span>
      )}
      <span className={compactOnMobile ? "hidden sm:inline-flex" : "inline-flex"}>
        <Image src="/brand/logo-color.webp" alt="" width={757} height={471} className="brand-light h-12 w-auto" />
        <Image src="/brand/logo-white.webp" alt="" width={757} height={471} className="brand-dark h-12 w-auto" />
      </span>
    </span>
  );
}
