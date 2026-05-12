"use client";

import { useState } from "react";
import { saveMemo, toggleBookmark } from "@/app/actions";

type LibraryItem = {
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
};

const ACTION_LABEL = { click: "クリック", bookmark: "ブクマ" } as const;

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function MemoModal({
  item,
  memoText,
  onClose,
  onSave,
}: {
  item: LibraryItem;
  memoText: string;
  onClose: () => void;
  onSave: (feedId: number, text: string) => void;
}) {
  const [text, setText] = useState(memoText);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[480px] border border-border rounded-md bg-bg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold">メモ</span>
          <button
            className="bg-transparent border-none text-lg text-text-tertiary cursor-pointer px-1"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        {/* Body */}
        <div className="p-4">
          <div className="text-sm font-medium mb-1">{item.title}</div>
          <div className="text-xs text-text-tertiary mb-4">
            {item.source} {formatDateLabel(item.createdAt)} {formatTime(item.createdAt)}
          </div>
          <textarea
            className="w-full min-h-[120px] p-3 border border-border rounded-sm text-sm leading-relaxed resize-y bg-bg text-text focus:outline-none focus:border-primary"
            placeholder="メモを入力（最大1000文字）"
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="text-right text-[10px] text-text-tertiary mt-1">
            {text.length}/1000
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            className="px-4 py-2 border border-border rounded-sm text-sm cursor-pointer bg-bg text-text hover:bg-bg-secondary"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 border border-primary rounded-sm text-sm cursor-pointer bg-primary text-white hover:bg-primary-hover"
            onClick={() => onSave(item.feedId, text.trim())}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export function LibraryView({
  items,
  categories,
}: {
  items: LibraryItem[];
  categories: string[];
}) {
  const [actionFilter, setActionFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("全て");
  const [query, setQuery] = useState("");
  const [memos, setMemos] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    for (const item of items) {
      if (item.memo) m[item.feedId] = item.memo;
    }
    return m;
  });
  const [bookmarkState, setBookmarkState] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const item of items) {
      m[item.feedId] = item.isBookmarked;
    }
    return m;
  });
  const [modalItem, setModalItem] = useState<LibraryItem | null>(null);

  function handleToggleBookmark(feedId: number) {
    setBookmarkState((prev) => ({ ...prev, [feedId]: !prev[feedId] }));
    void toggleBookmark(feedId);
  }

  const filtered = items.filter((item) => {
    if (actionFilter !== "all" && item.action !== actionFilter) return false;
    if (catFilter !== "全て" && item.category !== catFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const memoMatch = (memos[item.feedId] ?? "").toLowerCase().includes(q);
      if (!item.title.toLowerCase().includes(q) && !memoMatch) return false;
    }
    return true;
  });

  function handleSaveMemo(feedId: number, text: string) {
    setMemos((prev) => {
      const next = { ...prev };
      if (text) next[feedId] = text;
      else delete next[feedId];
      return next;
    });
    setModalItem(null);
    void saveMemo(feedId, text);
  }

  const chipClass = (active: boolean) =>
    `inline-flex items-center px-2 py-[2px] border rounded-full text-[11px] whitespace-nowrap cursor-pointer transition-all ${
      active
        ? "bg-primary text-white border-primary"
        : "bg-bg border-border hover:bg-bg-secondary"
    }`;

  return (
    <>
      {/* Filter bar */}
      <div className="sticky top-[45px] z-10 flex flex-col gap-2 px-3 py-2 border-b border-border bg-bg">
        <input
          type="text"
          className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary"
          placeholder="タイトル・メモで検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto items-center [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] text-text-tertiary shrink-0 mr-1">種別:</span>
          {["all", "click", "bookmark"].map((a) => (
            <button
              key={a}
              className={chipClass(actionFilter === a)}
              onClick={() => setActionFilter(a)}
            >
              {a === "all" ? "全て" : a === "click" ? "クリック" : "ブックマーク"}
            </button>
          ))}
          <span className="text-[10px] text-text-tertiary shrink-0 ml-2 mr-1">カテゴリ:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              className={chipClass(catFilter === cat)}
              onClick={() => setCatFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-w-[800px] mx-auto">
        <div className="text-xs text-text-tertiary px-3 py-1">{filtered.length}件</div>
        <ul>
          {filtered.map((item, i) => {
            const dateLabel = formatDateLabel(item.createdAt);
            const prevDate = i > 0 ? formatDateLabel(filtered[i - 1].createdAt) : "";
            const hasMemo = !!memos[item.feedId];

            return (
              <li key={item.id}>
                {dateLabel !== prevDate && (
                  <div className="sticky top-[105px] z-[5] text-xs font-bold text-text-tertiary px-3 py-2 border-b border-border bg-bg-secondary">
                    {dateLabel}
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-[3px] border-b border-border transition-colors hover:bg-bg-secondary text-sm">
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1 py-[1px] rounded-sm min-w-[40px] text-center ${
                      item.action === "click"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {ACTION_LABEL[item.action]}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-text no-underline hover:text-primary transition-colors"
                  >
                    {item.title}
                  </a>
                  <span className="shrink-0 text-[10px] text-text-tertiary whitespace-nowrap">
                    {formatTime(item.createdAt)}
                  </span>
                  <button
                    type="button"
                    aria-label={bookmarkState[item.feedId] ? "ブックマーク解除" : "ブックマーク追加"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(item.feedId);
                    }}
                    className={`shrink-0 px-1 text-base leading-none cursor-pointer bg-transparent border-none transition-colors ${
                      bookmarkState[item.feedId]
                        ? "text-accent"
                        : "text-text-tertiary hover:text-accent"
                    }`}
                  >
                    {bookmarkState[item.feedId] ? "★" : "☆"}
                  </button>
                  <button
                    className={`shrink-0 px-[6px] py-[2px] border rounded-sm bg-transparent text-[10px] cursor-pointer transition-all hover:bg-bg-tertiary hover:text-text ${
                      hasMemo
                        ? "border-accent text-accent"
                        : "border-border text-text-tertiary"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalItem(item);
                    }}
                  >
                    {hasMemo ? "メモ有" : "メモ"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Memo modal */}
      {modalItem && (
        <MemoModal
          item={modalItem}
          memoText={memos[modalItem.feedId] ?? ""}
          onClose={() => setModalItem(null)}
          onSave={handleSaveMemo}
        />
      )}
    </>
  );
}
