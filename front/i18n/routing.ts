import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  // Always prefix the locale in the URL (/es, /en). x-default resolves to es
  // via the middleware.
  localePrefix: "always",
  // Localized (SEO) pathnames. The KEY is the internal pathname used in the
  // app/ folder structure and in <Link href>; each locale maps to its public
  // URL. Pages are added under app/[locale]/<internal> in later phases.
  pathnames: {
    "/": "/",
    "/partidos": { es: "/partidos", en: "/matches" },
    "/partidos/fixture": { es: "/partidos/fixture", en: "/matches/fixture" },
    "/partidos/resultados": { es: "/partidos/resultados", en: "/matches/results" },
    "/partido/[slug]": { es: "/partido/[slug]", en: "/match/[slug]" },
    "/en-vivo": { es: "/en-vivo", en: "/live" },
    "/plantel": { es: "/plantel", en: "/squad" },
    "/jugadores/[slug]": { es: "/jugadores/[slug]", en: "/players/[slug]" },
    "/posiciones": { es: "/posiciones", en: "/standings" },
    "/noticias": { es: "/noticias", en: "/news" },
    "/noticias/[slug]": { es: "/noticias/[slug]", en: "/news/[slug]" },
    "/fichajes": { es: "/fichajes", en: "/transfers" },
    "/bombonera": { es: "/la-bombonera", en: "/stadium" },
    "/newsletter": { es: "/newsletter", en: "/newsletter" },
    "/newsletter/confirmar": { es: "/newsletter/confirmar", en: "/newsletter/confirm" },
    "/newsletter/baja": { es: "/newsletter/baja", en: "/newsletter/unsubscribe" },
    "/ingresar": { es: "/ingresar", en: "/login" },
    "/registrarse": { es: "/registrarse", en: "/register" },
    "/verificar-email": { es: "/verificar-email", en: "/verify-email" },
    "/perfil": { es: "/perfil", en: "/profile" },
    "/socios": { es: "/socios", en: "/members" },
    "/sobre-el-sitio": { es: "/sobre-el-sitio", en: "/about" },
    "/terminos": { es: "/terminos", en: "/terms" },
    "/privacidad": { es: "/privacidad", en: "/privacy" },
    "/aviso-legal": { es: "/aviso-legal", en: "/legal-notice" },
    "/cookies": { es: "/cookies", en: "/cookies" },
    "/contacto": { es: "/contacto", en: "/contact" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
