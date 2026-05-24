import { prisma } from "@yaminabe/db";

type DeliveryMode = "trend" | "deep" | "casual" | "discovery" | "omakase";

const MODE_WEIGHTS: Record<DeliveryMode, { affinity: number; freshness: number; popularity: number }> = {
  trend:     { affinity: 0.2, freshness: 0.2, popularity: 0.6 },
  deep:      { affinity: 0.6, freshness: 0.2, popularity: 0.2 },
  casual:    { affinity: 0.2, freshness: 0.6, popularity: 0.2 },
  discovery: { affinity: -0.3, freshness: 0.3, popularity: 0.4 },
  omakase:   { affinity: 0.3, freshness: 0.4, popularity: 0.3 },
};

export async function buildTagAffinity(userId: string): Promise<Map<number, number>> {
  const userTags = await prisma.userTag.findMany({
    where: { userId, isExcluded: false, deletedAt: null },
    select: { tagId: true, weight: true },
  });

  const tagScores = new Map<number, number>();
  for (const ut of userTags) {
    const w = Number(ut.weight);
    if (w > 0) tagScores.set(ut.tagId, w);
  }

  if (tagScores.size === 0) return tagScores;

  const max = Math.max(...tagScores.values());
  const min = Math.min(...tagScores.values());
  const range = max - min || 1;
  for (const [k, v] of tagScores) {
    tagScores.set(k, (v - min) / range);
  }

  return tagScores;
}

function freshnessScore(publishedAt: Date | null, collectedAt: Date): number {
  const ref = publishedAt ?? collectedAt;
  const hoursAgo = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
  return Math.exp(-hoursAgo / 72);
}

function popularityScore(bookmarkCount: number): number {
  return Math.log2(bookmarkCount + 1) / 10;
}

function affinityScore(
  tagIds: number[],
  tagAffinity: Map<number, number>,
): number {
  if (tagIds.length === 0 || tagAffinity.size === 0) return 0;
  let sum = 0;
  for (const id of tagIds) {
    sum += tagAffinity.get(id) ?? 0;
  }
  return sum / tagIds.length;
}

export type ScoredContent = {
  contentId: number;
  score: number;
};

export function scoreContents(
  contents: {
    id: number;
    bookmarkCount: number;
    publishedAt: Date | null;
    collectedAt: Date;
    contentTags: { tagId: number }[];
  }[],
  tagAffinity: Map<number, number>,
  mode: DeliveryMode,
): Map<number, number> {
  const w = MODE_WEIGHTS[mode] ?? MODE_WEIGHTS.omakase;
  const scores = new Map<number, number>();

  for (const c of contents) {
    const aff = affinityScore(
      c.contentTags.map((ct) => ct.tagId),
      tagAffinity,
    );
    const fresh = freshnessScore(c.publishedAt, c.collectedAt);
    const pop = popularityScore(c.bookmarkCount);
    const total = w.affinity * aff + w.freshness * fresh + w.popularity * pop;
    scores.set(c.id, total);
  }

  return scores;
}

export async function getDeliveryMode(userId: string): Promise<DeliveryMode> {
  const setting = await prisma.userSetting.findUnique({
    where: { userId },
    select: { deliveryMode: true },
  });
  const mode = setting?.deliveryMode ?? "omakase";
  return (mode in MODE_WEIGHTS ? mode : "omakase") as DeliveryMode;
}
