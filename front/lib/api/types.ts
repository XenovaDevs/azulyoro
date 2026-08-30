// TypeScript mirror of the .NET API contract (docs/06). camelCase matches
// ASP.NET Core's default JSON serialization.

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MatchDto {
  id: string;
  extId: number;
  dateUtc: string;
  status: string;
  competitionId: string;
  competitionName: string | null;
  homeTeamId: string;
  homeTeamName: string | null;
  homeTeamLogoUrl: string | null;
  awayTeamId: string;
  awayTeamName: string | null;
  awayTeamLogoUrl: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  isBoca: boolean;
}

export interface MatchDetailDto extends MatchDto {
  venue: string | null;
  round: string | null;
  htHome: number | null;
  htAway: number | null;
  ftHome: number | null;
  ftAway: number | null;
  elapsed: number | null;
}

export interface EventDto {
  minute: number;
  extraMinute: number | null;
  type: string;
  detail: string | null;
  teamId: string | null;
  teamName: string | null;
  playerId: string | null;
  playerName: string | null;
  assistPlayerId: string | null;
  assistName: string | null;
}

export interface LineupPlayerDto {
  playerId: string;
  playerName: string | null;
  isStarter: boolean;
  grid: string | null;
  number: number | null;
}

export interface LineupDto {
  teamId: string;
  teamName: string | null;
  formation: string | null;
  coachName: string | null;
  players: LineupPlayerDto[];
}

export interface PlayerStatDto {
  playerId: string;
  playerName: string | null;
  teamId: string;
  teamName: string | null;
  minutes: number | null;
  rating: number | null;
  goals: number;
  assists: number;
  shotsTotal: number;
  shotsOn: number;
  passes: number;
  passesAccuracy: number | null;
  tackles: number;
  yellow: number;
  red: number;
}

export interface PlayerDto {
  id: string;
  extId: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  position: string;
  number: number | null;
  nationality: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  height: number | null;
  weight: number | null;
}

export interface PlayerSeasonStatDto {
  competitionId: string;
  seasonId: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  rating: number | null;
}

export interface StandingDto {
  rank: number;
  teamId: string;
  teamName: string | null;
  teamLogoUrl?: string | null;
  competitionId?: string;
  competitionName?: string | null;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form: string | null;
  groupName: string;
}

export interface CompetitionDto {
  id: string;
  extId: number;
  name: string;
  type: string;
  country: string | null;
  logoUrl: string | null;
}

// ── Content (news / rumors / editorials) ────────────────────────────────────

export type ArticleCategory = "News" | "Rumor" | "Editorial";

/** List-shape article (also used by /featured). */
export interface ArticleListItemDto {
  slug: string;
  category: ArticleCategory;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  isMembersOnly: boolean;
  publishedAt: string | null;
}

/** Full article detail. */
export interface ArticleDto {
  slug: string;
  category: ArticleCategory;
  locale: string;
  title: string;
  summary: string | null;
  bodyHtml: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  coverImageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  isMembersOnly?: boolean;
}

// ── Admin moderation / editing ──────────────────────────────────────────────

export interface ModerationItemDto {
  id: string;
  shortId: string;
  title: string;
  excerpt: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  category: ArticleCategory;
  status: string;
  scrapedAt: string | null;
  publishedAtSource: string | null;
}

export interface ArticleTranslationInput {
  title: string;
  summary: string;
  bodyHtml: string;
  metaTitle: string;
  metaDescription: string;
}

export interface UpdateArticleInput {
  translations: {
    es: ArticleTranslationInput;
    en: ArticleTranslationInput;
  };
  category: ArticleCategory;
  coverImageUrl: string;
  isMembersOnly: boolean;
}
