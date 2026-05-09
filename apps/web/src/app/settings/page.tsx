import { prisma } from "@yaminabe/db";
import { SettingsView } from "@/components/SettingsView";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const [parents, setting, userCategories] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { id: "asc" },
          select: { id: true, name: true },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.userSetting.findUnique({
      where: { userId: user.id },
      select: { deliveryMode: true, omakaseLevel: true },
    }),
    prisma.userCategory.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { categoryId: true },
    }),
  ]);

  const categories = parents.map((p) => ({
    id: p.id,
    name: p.name,
    children: p.children,
  }));

  return (
    <SettingsView
      categories={categories}
      currentDeliveryMode={setting?.deliveryMode ?? "omakase"}
      currentOmakaseLevel={setting?.omakaseLevel ?? 3}
      selectedCategoryIds={userCategories.map((uc) => uc.categoryId)}
      userEmail={user.email}
      userPlan={user.plan}
    />
  );
}
