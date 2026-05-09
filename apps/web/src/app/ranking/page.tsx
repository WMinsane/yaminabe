import { prisma } from "@yaminabe/db";
import { requireUser } from "@/lib/session";
import { RankingView } from "@/components/RankingView";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  await requireUser();
  const contents = await prisma.content.findMany({
    where: { deletedAt: null },
    include: {
      category: { include: { parent: true } },
    },
    orderBy: { bookmarkCount: "desc" },
    take: 200,
  });

  const grouped: Record<string, { id: number; title: string; url: string; bookmark_count: number; published_at: string | null }[]> = {};
  for (const c of contents) {
    const catName = c.category?.parent?.name ?? c.category?.name ?? "未分類";
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push({
      id: c.id,
      title: c.title,
      url: c.url,
      bookmark_count: c.bookmarkCount,
      published_at: c.publishedAt?.toISOString() ?? null,
    });
  }

  const groups = Object.entries(grouped).map(([category, items]) => ({ category, items }));

  return <RankingView groups={groups} />;
}
