"use server";

import { prisma } from "@yaminabe/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";

export async function saveMemo(contentId: number, memo: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" as const };

  const trimmed = memo.trim();
  const value = trimmed.length === 0 ? null : trimmed.slice(0, 1000);

  await prisma.userAction.upsert({
    where: { userId_contentId: { userId: user.id, contentId } },
    create: {
      userId: user.id,
      contentId,
      memo: value,
      updatedBy: user.id,
    },
    update: {
      memo: value,
      updatedBy: user.id,
    },
  });

  revalidatePath("/library");
  return { ok: true };
}

export async function recordClick(contentId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" as const };

  const existing = await prisma.userAction.findUnique({
    where: { userId_contentId: { userId: user.id, contentId } },
    select: { isClicked: true },
  });

  if (existing?.isClicked) {
    return { ok: true, recorded: false as const };
  }

  const now = new Date();
  await prisma.userAction.upsert({
    where: { userId_contentId: { userId: user.id, contentId } },
    create: {
      userId: user.id,
      contentId,
      isClicked: true,
      clickedAt: now,
      updatedBy: user.id,
    },
    update: {
      isClicked: true,
      clickedAt: now,
      updatedBy: user.id,
    },
  });

  return { ok: true, recorded: true as const };
}

export async function toggleBookmark(contentId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" as const };

  const existing = await prisma.userAction.findUnique({
    where: { userId_contentId: { userId: user.id, contentId } },
    select: { isBookmarked: true },
  });

  const next = !existing?.isBookmarked;
  const now = new Date();

  await prisma.userAction.upsert({
    where: { userId_contentId: { userId: user.id, contentId } },
    create: {
      userId: user.id,
      contentId,
      isBookmarked: next,
      bookmarkedAt: next ? now : null,
      updatedBy: user.id,
    },
    update: {
      isBookmarked: next,
      bookmarkedAt: next ? now : null,
      updatedBy: user.id,
    },
  });

  revalidatePath("/library");
  return { ok: true, isBookmarked: next };
}

export async function saveDisplayMode(mode: "light" | "dark") {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" as const };

  await prisma.userSetting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayMode: mode, updatedBy: user.id },
    update: { displayMode: mode, updatedBy: user.id },
  });

  return { ok: true };
}

const VALID_DELIVERY_MODES = ["trend", "deep", "casual", "discovery", "omakase"];

export async function saveSettings(data: {
  deliveryMode: string;
  omakaseLevel: number;
  categoryIds: number[];
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" as const };

  const mode = VALID_DELIVERY_MODES.includes(data.deliveryMode)
    ? data.deliveryMode
    : "omakase";
  const level = Math.min(5, Math.max(1, Math.round(data.omakaseLevel)));

  await prisma.userSetting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, deliveryMode: mode, omakaseLevel: level, updatedBy: user.id },
    update: { deliveryMode: mode, omakaseLevel: level, updatedBy: user.id },
  });

  await prisma.userCategory.deleteMany({
    where: { userId: user.id },
  });
  if (data.categoryIds.length > 0) {
    await prisma.userCategory.createMany({
      data: data.categoryIds.map((categoryId) => ({
        userId: user.id,
        categoryId,
        updatedBy: user.id,
      })),
    });
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
