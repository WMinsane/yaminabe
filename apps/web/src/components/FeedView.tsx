"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { recordClick, toggleBookmark, blockDomain } from "@/app/actions";
import { ArticlePreview } from "./ArticlePreview";

type FeedItem = {
  id: number;
  title: string;
  url: string;
  source: string;
  summary: string;
  category: string;
  tags: string[];
  bookmark_count: number;
  published_at: string;
  score: number;
  is_new: boolean;
  is_clicked: boolean;
  is_bookmarked: boolean;
  has_memo: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function DenseItem({
  item,
  index,
  onClicked,
  onBookmarkToggled,
  onPreview,
  onContextMenu,
}: {
  item: FeedItem;
  index: number;
  onClicked: (id: number) => void;
  onBookmarkToggled: (id: number, next: boolean) => void;
  onPreview: (item: FeedItem) => void;
  onContextMenu: (item: FeedItem, x: number, y: number) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      e.preventDefault();
      const touch = e.touches[0];
      onContextMenu(item, touch.clientX, touch.clientY);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(item, e.clientX, e.clientY);
  };
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      onPreview(item);
      return;
    }
    onClicked(item.id);
    void recordClick(item.id);
    window.open(item.url, "_blank", "noopener,noreferrer");
  };
  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !item.is_bookmarked;
    onBookmarkToggled(item.id, next);
    void toggleBookmark(item.id);
  };
  const domain = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const titleParts = [domain];
  if (item.summary) titleParts.push(item.summary);
  if (item.tags.length > 0) titleParts.push(`タグ: ${item.tags.join(", ")}`);
  const datePart = item.published_at ? new Date(item.published_at).toLocaleDateString("ja-JP") : "";
  if (item.bookmark_count > 0 || datePart) {
    titleParts.push([item.bookmark_count > 0 ? `${item.bookmark_count} users` : "", datePart].filter(Boolean).join(" | "));
  }

  return (
    <li
      className="border-b border-border last:border-b-0"
      onContextMenu={handleRightClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title={titleParts.join("\n")}
        className="flex items-baseline gap-2 px-3 py-[3px] text-sm leading-relaxed cursor-pointer transition-colors hover:bg-bg-secondary group no-underline"
      >
        <span className="shrink-0 w-[18px] text-right text-xs text-text-tertiary">
          {index + 1}
        </span>
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
          {item.is_new && (
            <span className="inline px-[3px] text-[10px] font-bold text-accent">New</span>
          )}
          <span
            className={`group-hover:text-primary ${
              item.is_clicked ? "text-visited" : "text-text"
            }`}
          >
            {item.title}
          </span>
          {item.has_memo && (
            <span className="ml-1 inline-block px-[4px] py-0 text-[9px] font-bold text-accent border border-accent rounded-sm align-middle">
              メモ
            </span>
          )}
          {item.tags[0] && (
            <span className="text-[10px] text-text-tertiary before:content-['['] after:content-[']']">
              {item.tags[0]}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={item.is_bookmarked ? "ブックマーク解除" : "ブックマーク追加"}
          className={`shrink-0 px-1 text-base leading-none cursor-pointer bg-transparent border-none transition-colors ${
            item.is_bookmarked ? "text-accent" : "text-text-tertiary hover:text-accent"
          }`}
        >
          {item.is_bookmarked ? "★" : "☆"}
        </button>
        <span className="shrink-0 flex items-baseline gap-2 text-[10px] text-text-tertiary whitespace-nowrap">
          {item.bookmark_count > 0 && (
            <span className="text-text-secondary font-medium">{item.bookmark_count}user</span>
          )}
          <span>{formatDate(item.published_at)}</span>
        </span>
      </a>
    </li>
  );
}

function DenseCard({
  category,
  items,
  onClicked,
  onBookmarkToggled,
  onPreview,
  onContextMenu,
}: {
  category: string;
  items: FeedItem[];
  onClicked: (id: number) => void;
  onBookmarkToggled: (id: number, next: boolean) => void;
  onPreview: (item: FeedItem) => void;
  onContextMenu: (item: FeedItem, x: number, y: number) => void;
}) {
  return (
    <div className="border border-border rounded-sm mb-2 lg:mb-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-tertiary text-xs font-bold border-b border-border">
        <span>{category}</span>
        <span className="text-text-tertiary font-normal">{items.length}件</span>
      </div>
      <ul>
        {items.map((item, i) => (
          <DenseItem
            key={item.id}
            item={item}
            index={i}
            onClicked={onClicked}
            onBookmarkToggled={onBookmarkToggled}
            onPreview={onPreview}
            onContextMenu={onContextMenu}
          />
        ))}
      </ul>
    </div>
  );
}

const INITIAL_PER_CAT = 5;
const MORE_PER_CAT = 5;

export function FeedView({
  feeds,
  categories,
}: {
  feeds: FeedItem[];
  categories: string[];
}) {
  const [activeCat, setActiveCat] = useState("全て");
  const [feedState, setFeedState] = useState(feeds);
  const [catVisible, setCatVisible] = useState<Record<string, number>>({});
  const [previewItem, setPreviewItem] = useState<FeedItem | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ item: FeedItem; x: number; y: number } | null>(null);

  const handleClicked = (id: number) => {
    setFeedState((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_clicked: true } : f))
    );
  };
  const handleBookmarkToggled = (id: number, next: boolean) => {
    setFeedState((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_bookmarked: next } : f))
    );
  };
  const handlePreview = (item: FeedItem) => {
    setPreviewItem(item);
  };
  const handlePreviewOpen = () => {
    if (!previewItem) return;
    handleClicked(previewItem.id);
    void recordClick(previewItem.id);
    window.open(previewItem.url, "_blank", "noopener,noreferrer");
    setPreviewItem(null);
  };
  const handleContextMenu = useCallback((item: FeedItem, x: number, y: number) => {
    setCtxMenu({ item, x, y });
  }, []);
  const handleBlockDomain = useCallback(async () => {
    if (!ctxMenu) return;
    const domain = extractDomain(ctxMenu.item.url);
    if (!domain) return;
    setFeedState((prev) => prev.filter((f) => extractDomain(f.url) !== domain));
    setCtxMenu(null);
    await blockDomain(domain);
  }, [ctxMenu]);

  const grouped: Record<string, FeedItem[]> = {};
  for (const f of feedState) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  const visibleFor = (cat: string) => catVisible[cat] ?? INITIAL_PER_CAT;
  const showMore = (cat: string) =>
    setCatVisible((prev) => ({ ...prev, [cat]: visibleFor(cat) + MORE_PER_CAT }));

  if (activeCat !== "全て") {
    const items = grouped[activeCat] ?? [];
    const limit = visibleFor(activeCat);
    const visible = items.slice(0, limit);
    const hasMore = items.length > limit;
    return (
      <>
        <CatNav categories={categories} activeCat={activeCat} onSelect={(c) => { setActiveCat(c); setCatVisible({}); }} />
        <div className="max-w-[960px] mx-auto p-2 sm:p-3 lg:max-w-[1280px]">
          <DenseCard category={activeCat} items={visible} onClicked={handleClicked} onBookmarkToggled={handleBookmarkToggled} onPreview={handlePreview} onContextMenu={handleContextMenu} />
          {hasMore && <MoreButton onClick={() => showMore(activeCat)} />}
        </div>
        {previewItem && (
          <ArticlePreview
            title={previewItem.title}
            url={previewItem.url}
            source={previewItem.source}
            summary={previewItem.summary}
            tags={previewItem.tags}
            bookmarkCount={previewItem.bookmark_count}
            publishedAt={previewItem.published_at}
            onClose={() => setPreviewItem(null)}
            onOpen={handlePreviewOpen}
          />
        )}
        {ctxMenu && (
          <DomainContextMenu
            domain={extractDomain(ctxMenu.item.url)}
            x={ctxMenu.x}
            y={ctxMenu.y}
            onBlock={handleBlockDomain}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <CatNav categories={categories} activeCat={activeCat} onSelect={(c) => { setActiveCat(c); setCatVisible({}); }} />
      <div className="max-w-[960px] mx-auto p-2 sm:p-3 lg:max-w-[1280px] lg:grid lg:grid-cols-2 lg:gap-2">
        {Object.entries(grouped).map(([cat, items]) => {
          const limit = visibleFor(cat);
          const visible = items.slice(0, limit);
          const hasMore = items.length > limit;
          return (
            <div key={cat}>
              <DenseCard category={cat} items={visible} onClicked={handleClicked} onBookmarkToggled={handleBookmarkToggled} onPreview={handlePreview} onContextMenu={handleContextMenu} />
              {hasMore && <MoreButton onClick={() => showMore(cat)} />}
            </div>
          );
        })}
      </div>
      {previewItem && (
        <ArticlePreview
          title={previewItem.title}
          url={previewItem.url}
          source={previewItem.source}
          summary={previewItem.summary}
          tags={previewItem.tags}
          bookmarkCount={previewItem.bookmark_count}
          publishedAt={previewItem.published_at}
          onClose={() => setPreviewItem(null)}
          onOpen={handlePreviewOpen}
        />
      )}
      {ctxMenu && (
        <DomainContextMenu
          domain={extractDomain(ctxMenu.item.url)}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onBlock={handleBlockDomain}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}

function CatNav({ categories, activeCat, onSelect }: { categories: string[]; activeCat: string; onSelect: (cat: string) => void }) {
  return (
    <nav className="flex items-center gap-2 px-3 py-2 border-b-2 border-border overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`inline-flex items-center px-2 py-[1px] border rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all ${
            activeCat === cat
              ? "bg-primary text-white border-primary"
              : "bg-bg border-border hover:bg-bg-secondary"
          }`}
        >
          {cat}
        </button>
      ))}
    </nav>
  );
}

function MoreButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center py-2">
      <button
        onClick={onClick}
        className="px-6 py-1.5 border border-border rounded-sm text-xs cursor-pointer bg-bg hover:bg-bg-secondary transition-colors"
      >
        もっと見る
      </button>
    </div>
  );
}

function DomainContextMenu({
  domain,
  x,
  y,
  onBlock,
  onClose,
}: {
  domain: string;
  x: number;
  y: number;
  onBlock: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed z-[400] bg-bg border border-border rounded shadow-lg py-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onBlock}
        className="w-full text-left px-4 py-2 text-sm cursor-pointer bg-transparent border-none hover:bg-bg-secondary transition-colors text-text"
      >
        {domain} を非表示にする
      </button>
      <button
        onClick={onClose}
        className="w-full text-left px-4 py-2 text-sm cursor-pointer bg-transparent border-none hover:bg-bg-secondary transition-colors text-text-tertiary"
      >
        キャンセル
      </button>
    </div>
  );
}
