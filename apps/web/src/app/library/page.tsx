import { prisma } from "@yaminabe/db";
import { LibraryView } from "@/components/LibraryView";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireUser();

  const actions = await prisma.userAction.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      OR: [{ isClicked: true }, { isBookmarked: true }],
      content: { deletedAt: null },
    },
    include: {
      content: {
        include: { category: { include: { parent: true } } },
      },
    },
    orderBy: [{ clickedAt: "desc" }, { bookmarkedAt: "desc" }],
    take: 500,
  });

  const items = actions.flatMap((a) => {
    const c = a.content;
    const category = c.category?.parent?.name ?? c.category?.name ?? "未分類";
    const rows: {
      id: number;
      feedId: number;
      action: "click" | "bookmark";
      title: string;
      url: string;
      source: string;
      category: string;
      createdAt: string;
      memo: string | null;
      isBookmarked: boolean;
    }[] = [];
    if (a.isBookmarked && a.bookmarkedAt) {
      rows.push({
        id: c.id * 10 + 2,
        feedId: c.id,
        action: "bookmark",
        title: c.title,
        url: c.url,
        source: c.source,
        category,
        createdAt: a.bookmarkedAt.toISOString(),
        memo: a.memo,
        isBookmarked: true,
      });
    } else if (a.isClicked && a.clickedAt) {
      rows.push({
        id: c.id * 10 + 1,
        feedId: c.id,
        action: "click",
        title: c.title,
        url: c.url,
        source: c.source,
        category,
        createdAt: a.clickedAt.toISOString(),
        memo: a.memo,
        isBookmarked: a.isBookmarked,
      });
    }
    return rows;
  });

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const categories = [
    "全て",
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ];

  return <LibraryView items={items} categories={categories} />;
}
