/** Translate provider terminology at the display boundary; keep identifiers intact. */
export function sportsRoundLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  if (!locale.toLowerCase().startsWith("es")) return value;

  return value
    .replace(/\bclub friendl(?:ies|y)\b/gi, "Amistosos de clubes")
    .replace(/\bround of 128\b/gi, "64avos de final")
    .replace(/\bround of 64\b/gi, "32avos de final")
    .replace(/\bround of 32\b/gi, "16avos de final")
    .replace(/\bround of 16\b/gi, "Octavos de final")
    .replace(/\bquarter[ -]?finals?\b/gi, "Cuartos de final")
    .replace(/\bsemi[ -]?finals?\b/gi, "Semifinales")
    .replace(/\b(?:third|3rd)[ -]place(?: play[ -]?off)?\b/gi, "Tercer puesto")
    .replace(/\b(?:first|1st)\s+leg\b|\bleg\s*1\b/gi, "Ida")
    .replace(/\b(?:second|2nd)\s+leg\b|\bleg\s*2\b/gi, "Vuelta")
    .replace(/\bgroup stage\b/gi, "Fase de grupos")
    .replace(/\bregular season\b/gi, "Fase regular")
    .replace(/\bpreliminary rounds?\b/gi, "Ronda preliminar")
    .replace(/\bqualif(?:ying|ication) rounds?\b/gi, "Ronda clasificatoria")
    .replace(/\bqualif(?:ying|ication) stage\b/gi, "Fase clasificatoria")
    .replace(/\bknockout(?: stage| rounds?)?\b/gi, "Eliminatorias")
    .replace(/\bplay[ -]?offs?\b/gi, "Eliminatorias")
    .replace(/\b(\d+)(?:st|nd|rd|th)\s+round\b/gi, "Ronda $1")
    .replace(/\b(first|second|third|fourth)\s+round\b/gi, (_, ordinal: string) => {
      const number: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
      return `Ronda ${number[ordinal.toLowerCase()]}`;
    })
    .replace(/\bmatchday\s*(\d+)\b/gi, "Fecha $1")
    .replace(/\bround\s*[-:]?\s*(\d+)\b/gi, "Ronda $1")
    .replace(/\bgroup\b/gi, "Grupo")
    .replace(/\bgroups\b/gi, "Grupos")
    .replace(/\bzone\b/gi, "Zona")
    .replace(/\bpreliminary\b/gi, "Preliminar")
    .replace(/\bqualifying\b/gi, "Clasificación")
    .replace(/\bphase\b|\bstage\b/gi, "Fase")
    .replace(/\bround\b/gi, "Ronda")
    .replace(/\bfinals\b/gi, "Final")
    .replace(/\bannual(?: table)?\b/gi, "Tabla anual")
    .replace(/\boverall\b/gi, "General")
    .replace(/\bstandings\b/gi, "Posiciones");
}

export function sportsPhaseLabel(value: string, locale: string): string {
  const spanish = locale.toLowerCase().startsWith("es");
  const labels: Record<string, [string, string]> = {
    apertura: ["Apertura", "Apertura"], clausura: ["Clausura", "Clausura"],
    annual: ["Tabla anual", "Annual table"], groups: ["Fase de grupos", "Group stage"],
    playoffs: ["Eliminatorias", "Knockout stage"], league: ["Fase regular", "Regular season"],
  };
  return labels[value.toLowerCase()]?.[spanish ? 0 : 1] ?? sportsRoundLabel(value, locale);
}

/** Competition brands and team names are proper nouns, not arbitrary text to translate. */
export function sportsCompetitionLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  if (!locale.toLowerCase().startsWith("es")) return value;
  const labels: Record<string, string> = {
    "argentine primera division": "Primera División Argentina",
    "argentina primera division": "Primera División Argentina",
    "argentinian primera division": "Primera División Argentina",
    "argentine cup": "Copa Argentina",
    "argentina cup": "Copa Argentina",
    "fifa club world cup": "Mundial de Clubes FIFA",
    "fifa intercontinental cup": "Copa Intercontinental FIFA",
    "club world cup": "Mundial de Clubes",
    "friendlies clubs": "Amistosos de clubes",
    "club friendlies": "Amistosos de clubes",
    "copa de la liga profesional": "Copa de la Liga Profesional",
  };
  return labels[value.toLowerCase().trim()] ?? value;
}
