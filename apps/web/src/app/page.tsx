import { prisma } from "@yaminabe/db";
import { FeedView } from "@/components/FeedView";
import { requireUser } from "@/lib/session";
import { buildTagAffinity, scoreContents, getDeliveryMode } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const ITEMS_PER_CATEGORY = 20;

export default async function FeedPage() {
  const user = await requireUser();

  const [userCategories, tagAffinity, deliveryMode] = await Promise.all([
    prisma.userCategory.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { categoryId: true },
    }),
    buildTagAffinity(user.id),
    getDeliveryMode(user.id),
  ]);

  const selectedChildIds = userCategories.map((uc) => uc.categoryId);
  const categoryFilter =
    selectedChildIds.length > 0
      ? { categoryId: { in: selectedChildIds } }
      : {};

  const contents = await prisma.content.findMany({
    where: { deletedAt: null, ...categoryFilter },
    include: {
      category: { include: { parent: true } },
      contentTags: { include: { tag: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const scores = scoreContents(
    contents.map((c) => ({
      id: c.id,
      bookmarkCount: c.bookmarkCount,
      publishedAt: c.publishedAt,
      collectedAt: c.collectedAt,
      contentTags: c.contentTags.map((ct) => ({ tagId: ct.tagId })),
    })),
    tagAffinity,
    deliveryMode,
  );

  const byParent = new Map<string, typeof contents>();
  for (const c of contents) {
    const parentName = c.category?.parent?.name ?? c.category?.name ?? "未分類";
    const list = byParent.get(parentName) ?? [];
    list.push(c);
    byParent.set(parentName, list);
  }

  const top: typeof contents = [];
  for (const [, list] of byParent) {
    list.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    top.push(...list.slice(0, ITEMS_PER_CATEGORY));
  }

  const contentIds = top.map((c) => c.id);
  const actions = await prisma.userAction.findMany({
    where: {
      userId: user.id,
      contentId: { in: contentIds },
      deletedAt: null,
    },
    select: {
      contentId: true,
      isClicked: true,
      isBookmarked: true,
      memo: true,
    },
  });
  const actionMap = new Map(actions.map((a) => [a.contentId, a]));

  const latestCollected = Math.max(
    ...top.map((c) => c.collectedAt?.getTime() ?? 0),
  );

  const feeds = top.map((c) => {
    const a = actionMap.get(c.id);
    return {
      id: c.id,
      title: c.title,
      url: c.url,
      source: c.source,
      category: c.category?.parent?.name ?? c.category?.name ?? "未分類",
      tags: c.contentTags.map((ct) => ct.tag.name).slice(0, 3),
      bookmark_count: c.bookmarkCount,
      published_at: (c.publishedAt ?? c.collectedAt).toISOString(),
      score: scores.get(c.id) ?? 0,
      is_new:
        latestCollected - (c.collectedAt?.getTime() ?? 0) < 24 * 60 * 60 * 1000,
      is_clicked: a?.isClicked ?? false,
      is_bookmarked: a?.isBookmarked ?? false,
      has_memo: !!a?.memo,
    };
  });

  feeds.sort((a, b) => b.score - a.score);

  const categories = [
    "全て",
    ...Array.from(new Set(feeds.map((f) => f.category))),
  ];

  return <FeedView feeds={feeds} categories={categories} />;
}
