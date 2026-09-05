import { apiGet, apiGetOrNull } from "./client";
import type {
  CompetitionDto,
  CompetitionOverviewDto,
  EventDto,
  LineupDto,
  MatchDetailDto,
  MatchDto,
  PagedResult,
  PlayerDto,
  PlayerSeasonStatDto,
  PlayerStatDto,
  StandingDto,
} from "./types";

const SHORT = 60; // volatile (matches/next)
const HOUR = 3600; // stable squad data

export interface MatchQuery {
  status?: "upcoming" | "finished" | "live";
  competitionId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  season?: number;
  bocaOnly?: boolean;
  round?: string;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const getCompetitions = (season?: number) =>
  apiGet<CompetitionDto[]>(`/api/competitions${qs({ season, bocaOnly: true })}`, { tags: ["competitions"], revalidate: SHORT });

export const getCompetitionOverview = (id: string, season: number) =>
  apiGet<CompetitionOverviewDto>(`/api/competitions/${encodeURIComponent(id)}/overview${qs({ season })}`, {
    tags: ["competitions", "matches", "standings"],
    revalidate: false,
  });

export const getSquad = () =>
  apiGet<PlayerDto[]>("/api/squad", { tags: ["squad"], revalidate: HOUR });

export const getPlayer = (id: string) =>
  apiGetOrNull<PlayerDto>(`/api/players/${id}`, { tags: ["squad"], revalidate: HOUR });

export const getPlayerStats = (id: string, season?: number) =>
  apiGet<PlayerSeasonStatDto[]>(`/api/players/${id}/stats${qs({ season })}`, {
    tags: ["squad"],
    revalidate: HOUR,
  });

export const getMatches = (query: MatchQuery = {}) =>
  apiGet<PagedResult<MatchDto>>(`/api/matches${qs({ ...query })}`, {
    tags: ["matches"],
    revalidate: false,
  });

/** Follow pagination so the full-season fixture never silently stops at 50. */
export async function getAllMatches(query: Omit<MatchQuery, "page" | "pageSize"> = {}): Promise<MatchDto[]> {
  const first = await getMatches({ ...query, page: 1, pageSize: 50 });
  if (!first) return [];
  const pages = Math.ceil(first.total / first.pageSize);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
    getMatches({ ...query, page: index + 2, pageSize: first.pageSize })));
  return [...first.items, ...remaining.flatMap((page) => page?.items ?? [])];
}

export const getNextMatch = () =>
  apiGetOrNull<MatchDto>("/api/matches/next", { tags: ["matches"], revalidate: SHORT });

/** Live matches — never cached (204 → null). */
export const getLiveMatches = () =>
  apiGet<MatchDto[] | null>("/api/matches/live", { revalidate: false });

export const getMatch = (id: string) =>
  apiGetOrNull<MatchDetailDto>(`/api/matches/${id}`, { tags: [`match:${id}`], revalidate: false });

export const getMatchEvents = (id: string) =>
  apiGet<EventDto[]>(`/api/matches/${id}/events`, { tags: [`match:${id}`], revalidate: SHORT });

export const getMatchLineups = (id: string) =>
  apiGet<LineupDto[]>(`/api/matches/${id}/lineups`, { tags: [`match:${id}`], revalidate: SHORT });

export const getMatchPlayerStats = (id: string) =>
  apiGet<PlayerStatDto[]>(`/api/matches/${id}/player-stats`, {
    tags: [`match:${id}`],
    revalidate: SHORT,
  });

export const getStandings = (competitionId?: string, season?: number) =>
  apiGet<StandingDto[]>(`/api/standings${qs({ competitionId, season })}`, {
    tags: ["standings"],
    revalidate: false,
  });
