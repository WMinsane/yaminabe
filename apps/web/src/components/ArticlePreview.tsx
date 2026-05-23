"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  url: string;
  source: string;
  summary: string;
  tags: string[];
  bookmarkCount: number;
  publishedAt: string;
  onClose: () => void;
  onOpen: () => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function ArticlePreview({
  title,
  url,
  source,
  summary,
  tags,
  bookmarkCount,
  publishedAt,
  onClose,
  onOpen,
}: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg border-t border-border rounded-t-xl shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
          <span className="text-xs text-text-tertiary">{extractDomain(url)}</span>
          <button
            onClick={onClose}
            className="border-none bg-transparent p-1 cursor-pointer text-text-tertiary hover:text-text text-lg leading-none"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          <h2 className="text-base font-bold leading-snug mb-2">{title}</h2>

          <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
            <span>{formatDate(publishedAt)}</span>
            {bookmarkCount > 0 && (
              <span className="text-text-secondary font-medium">{bookmarkCount} users</span>
            )}
          </div>

          {summary && (
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              {summary}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] bg-bg-tertiary text-text-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 flex flex-col gap-2 border-t border-border">
          <button
            onClick={onOpen}
            className="w-full py-2.5 border-none rounded-sm bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-hover transition-colors"
          >
            ブラウザで開く
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 border border-border rounded-sm bg-transparent text-sm text-text-secondary cursor-pointer hover:bg-bg-secondary transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
