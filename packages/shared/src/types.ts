/** カテゴリ */
export type Category = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
};

/** コンテンツ */
export type Content = {
  id: number;
  url: string;
  title: string;
  source: string;
  categoryId: number | null;
  author: string | null;
  summary: string | null;
  bookmarkCount: number;
  publishedAt: string | null;
};

/** ユーザープラン */
export type Plan = "free" | "premium";

/** 配信モード */
export type DeliveryMode =
  | "trend"
  | "deep"
  | "casual"
  | "discovery"
  | "omakase";

/** 表示モード */
export type DisplayMode = "light" | "dark";
