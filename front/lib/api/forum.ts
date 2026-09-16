import type {
  ForumCategoryDto,
  ForumPostDto,
  ForumTopicDetailDto,
  ForumTopicSummaryDto,
  ModeratedUserDto,
  PagedResult,
} from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

/**
 * Fetch all active forum categories with statistics.
 */
export async function getForumCategories(): Promise<ForumCategoryDto[]> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/categories`, {
      next: { revalidate: 30, tags: ["forum-categories"] },
    });
    if (!res.ok) return [];
    return (await res.json()) as ForumCategoryDto[];
  } catch {
    return [];
  }
}

/**
 * Fetch category by slug along with its topics.
 */
export async function getCategoryBySlug(
  slug: string,
  page = 1,
): Promise<{ category: ForumCategoryDto; topics: ForumTopicSummaryDto[]; total: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/categories/${encodeURIComponent(slug)}?page=${page}`, {
      next: { revalidate: 15, tags: [`forum-category-${slug}`] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch recent topics with optional filtering.
 */
export async function getForumTopics(options?: {
  categoryId?: string;
  matchId?: string;
  search?: string;
  page?: number;
}): Promise<PagedResult<ForumTopicSummaryDto>> {
  try {
    const params = new URLSearchParams();
    if (options?.categoryId) params.set("categoryId", options.categoryId);
    if (options?.matchId) params.set("matchId", options.matchId);
    if (options?.search) params.set("search", options.search);
    if (options?.page) params.set("page", String(options.page));

    const res = await fetch(`${API_BASE}/api/forum/topics?${params.toString()}`, {
      next: { revalidate: 15, tags: ["forum-topics"] },
    });
    if (!res.ok) return { items: [], page: 1, pageSize: 20, total: 0 };
    return await res.json();
  } catch {
    return { items: [], page: 1, pageSize: 20, total: 0 };
  }
}

/**
 * Fetch full topic detail with replies.
 */
export async function getForumTopicDetail(idOrSlug: string): Promise<ForumTopicDetailDto | null> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/topics/${encodeURIComponent(idOrSlug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ForumTopicDetailDto;
  } catch {
    return null;
  }
}

/**
 * Fetch or auto-create the discussion topic for a specific match fixture.
 */
export async function getMatchTopic(matchId: string): Promise<ForumTopicDetailDto | null> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/match/${encodeURIComponent(matchId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ForumTopicDetailDto;
  } catch {
    return null;
  }
}

/**
 * Create a new topic (Client call).
 */
export async function createTopic(data: {
  categoryId: string;
  matchId?: string | null;
  title: string;
  content: string;
}): Promise<{ ok: boolean; data?: any; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (res.status === 401) {
      return {
        ok: false,
        unauthorized: true,
        error: "Debes iniciar sesión o registrarte para publicar en el foro.",
      };
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.detail || json.message || "Error al crear el tema" };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error de red" };
  }
}

/**
 * Post a reply to a topic (Client call).
 */
export async function createPost(
  topicId: string,
  content: string,
): Promise<{ ok: boolean; data?: ForumPostDto; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/topics/${encodeURIComponent(topicId)}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (res.status === 401) {
      return {
        ok: false,
        unauthorized: true,
        error: "Debes iniciar sesión o registrarte para publicar un comentario.",
      };
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.detail || json.message || "Error al enviar el comentario" };
    }
    return { ok: true, data: json as ForumPostDto };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error de red" };
  }
}

/**
 * Admin: Moderate a user (suspend, ban, unban).
 */
export async function moderateUser(data: {
  userId: string;
  action: "suspend" | "ban" | "unban";
  days?: number;
  reason?: string;
}): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/admin/moderate-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.detail || json.message || "Error al moderar usuario" };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error de red" };
  }
}

/**
 * Admin: Get list of currently moderated users.
 */
export async function getModeratedUsers(): Promise<ModeratedUserDto[]> {
  try {
    const res = await fetch(`${API_BASE}/api/forum/admin/moderated-users`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as ModeratedUserDto[];
  } catch {
    return [];
  }
}
