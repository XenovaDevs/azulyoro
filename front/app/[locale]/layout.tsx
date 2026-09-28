import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { siteName, siteUrl } from "@/lib/site";
import "../globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: "Sitio no oficial de fans de Boca Juniors.",
  openGraph: {
    siteName,
    images: [{ url: "/brand/social.png", width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/brand/social.png", alt: siteName }],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Header />
          {children}
          <Footer />
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
