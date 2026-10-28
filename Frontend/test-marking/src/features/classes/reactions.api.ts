import axiosClient from "@/api/axiosClient";

export const REACTION_TYPES = ["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];
export type ReactionTarget = "post" | "comment";

export interface ReactionSummary {
  viewer_reaction: ReactionType | null;
  total_count: number;
  counts: { reaction_type: ReactionType; count: number }[];
}

export interface Reactor {
  user_id: string;
  name: string;
  avatar_url: string | null;
  reaction_type: ReactionType;
  reacted_at: string;
}

export const EMPTY_REACTION_SUMMARY: ReactionSummary = { viewer_reaction: null, total_count: 0, counts: [] };

function path(classId: string, target: ReactionTarget, targetId: string) {
  return `/classes/${classId}/${target === "post" ? "posts" : "comments"}/${targetId}`;
}

/** Pass null to remove my reaction. Returns the new summary. */
export async function setReaction(
  classId: string,
  target: ReactionTarget,
  targetId: string,
  reactionType: ReactionType | null,
): Promise<ReactionSummary> {
  const { data } = await axiosClient.put<{ data: ReactionSummary }>(`${path(classId, target, targetId)}/reaction`, {
    reaction_type: reactionType,
  });
  return data.data;
}

export async function getReactors(classId: string, target: ReactionTarget, targetId: string): Promise<Reactor[]> {
  const { data } = await axiosClient.get<{ data: Reactor[] }>(`${path(classId, target, targetId)}/reactions`);
  return data.data;
}
