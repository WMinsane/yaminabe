"use client";

import { useState } from "react";

type RankingItem = {
  id: number;
  title: string;
  url: string;
  bookmark_count: number;
  published_at: string | null;
};

type RankingGroup = {
  category: string;
  items: RankingItem[];
};

const RANK_COLORS = ["text-[#FFD700]", "text-[#C0C0C0]", "text-[#CD7F32]"];
const INITIAL_PER_CAT = 5;
const MORE_PER_CAT = 5;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function RankingView({ groups }: { groups: RankingGroup[] }) {
  const [catVisible, setCatVisible] = useState<Record<string, number>>({});

  const visibleFor = (cat: string) => catVisible[cat] ?? INITIAL_PER_CAT;
  const showMore = (cat: string) =>
    setCatVisible((prev) => ({ ...prev, [cat]: visibleFor(cat) + MORE_PER_CAT }));

  return (
    <div className="max-w-[960px] mx-auto p-2 sm:p-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
      {groups.map(({ category, items }) => {
        const limit = visibleFor(category);
        const visible = items.slice(0, limit);
        const hasMore = items.length > limit;
        return (
          <div key={category} className="border border-border rounded-sm mb-3 lg:mb-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1 bg-bg-tertiary text-xs font-bold border-b border-border">
              <span>{category}</span>
              <span className="text-text-tertiary font-normal">{items.length}件</span>
            </div>
            <ul>
              {visible.map((item, i) => (
                <li
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline gap-2 px-2 py-[2px] text-sm transition-colors hover:bg-bg-secondary no-underline"
                  >
                    <span
                      className={`shrink-0 w-[18px] text-right text-xs font-bold ${
                        i < 3 ? RANK_COLORS[i] : "text-text-tertiary"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-text">
                      {item.title}
                    </span>
                    {item.published_at && (
                      <span className="shrink-0 text-[10px] text-text-tertiary whitespace-nowrap">
                        {formatDate(item.published_at)}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {item.bookmark_count}u
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="text-center py-2">
                <button
                  onClick={() => showMore(category)}
                  className="px-6 py-1.5 border border-border rounded-sm text-xs cursor-pointer bg-bg hover:bg-bg-secondary transition-colors"
                >
                  もっと見る
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
