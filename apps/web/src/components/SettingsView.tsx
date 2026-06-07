"use client";

import { useState, useTransition } from "react";
import { saveSettings, excludeTag, restoreTag, addTag, searchTags, unblockDomain } from "@/app/actions";

type Child = { id: number; name: string };
type Category = { id: number; name: string; children: Child[] };

const MODES = [
  { icon: "⚖", name: "バランス", value: "omakase" },
  { icon: "🔍", name: "発見", value: "discovery" },
  { icon: "🎯", name: "集中", value: "deep" },
  { icon: "📈", name: "トレンド", value: "trend" },
  { icon: "🎲", name: "ランダム", value: "casual" },
] as const;

const OMAKASE_LABELS: Record<number, string> = {
  1: "パーソナライズ重視",
  2: "やや固定",
  3: "バランス",
  4: "やや冒険",
  5: "フルランダム",
};

type TagItem = { id: number; name: string; weight: number; isExcluded: boolean };

type Props = {
  categories: Category[];
  currentDeliveryMode: string;
  currentOmakaseLevel: number;
  selectedCategoryIds: number[];
  userEmail: string;
  userPlan: string;
  userTags: TagItem[];
  blockedDomains: string[];
};

export function SettingsView({
  categories,
  currentDeliveryMode,
  currentOmakaseLevel,
  selectedCategoryIds,
  userEmail,
  userPlan,
  userTags,
  blockedDomains,
}: Props) {
  const [selectedMode, setSelectedMode] = useState(
    () => Math.max(0, MODES.findIndex((m) => m.value === currentDeliveryMode))
  );
  const [omakaseLevel, setOmakaseLevel] = useState(currentOmakaseLevel);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(selectedCategoryIds)
  );
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggleParent(cat: Category) {
    const allOn = cat.children.every((c) => selectedIds.has(c.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) {
        cat.children.forEach((c) => next.delete(c.id));
        next.delete(cat.id);
      } else {
        cat.children.forEach((c) => next.add(c.id));
        next.add(cat.id);
      }
      return next;
    });
  }

  function toggleChild(childId: number, cat: Category) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
        next.delete(cat.id);
      } else {
        next.add(childId);
        if (cat.children.every((c) => c.id === childId || next.has(c.id))) {
          next.add(cat.id);
        }
      }
      return next;
    });
  }

  function toggleExpand(catId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const childIds = [...selectedIds].filter((id) =>
        categories.some((cat) => cat.children.some((c) => c.id === id))
      );
      await saveSettings({
        deliveryMode: MODES[selectedMode].value,
        omakaseLevel,
        categoryIds: childIds,
      });
      setSaved(true);
    });
  }

  return (
    <div className="max-w-[960px] mx-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
      {/* Delivery mode */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
          配信モード
        </div>
        <div className="p-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {MODES.map((mode, i) => (
              <button
                key={mode.name}
                onClick={() => setSelectedMode(i)}
                className={`shrink-0 text-center px-2 py-1.5 border rounded-sm cursor-pointer min-w-[80px] text-xs transition-all ${
                  selectedMode === i
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-bg-secondary"
                }`}
              >
                <div className="text-lg mb-1">{mode.icon}</div>
                <div className="font-medium">{mode.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Omakase level */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
          おまかせレベル
        </div>
        <div className="p-2">
          <div className="text-center py-1">
            <div className="text-xs text-text-tertiary mb-1">どれくらい冒険する？</div>
            <div className="text-2xl font-bold text-primary">
              {OMAKASE_LABELS[omakaseLevel]}
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={omakaseLevel}
            onChange={(e) => setOmakaseLevel(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between px-[2px] text-xs text-text-secondary font-medium mb-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>パーソナライズ重視</span>
            <span>フルランダム</span>
          </div>
        </div>
      </div>

      {/* Category tree */}
      <div className="border border-border rounded-md overflow-hidden md:col-span-2">
        <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
          興味カテゴリ
        </div>
        <div className="p-2">
          {categories.map((cat) => {
            const allOn = cat.children.every((c) => selectedIds.has(c.id));
            const someOn = !allOn && cat.children.some((c) => selectedIds.has(c.id));
            const isExpanded = expanded.has(cat.id) || allOn || someOn;

            return (
              <div key={cat.id} className="border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <span
                    className={`w-4 text-[10px] text-text-tertiary text-center shrink-0 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {cat.children.length > 0 ? "▶" : ""}
                  </span>
                  <span
                    className={`w-[18px] h-[18px] border-2 rounded-[3px] flex items-center justify-center text-[11px] shrink-0 cursor-pointer transition-all ${
                      allOn
                        ? "border-primary bg-primary text-white"
                        : someOn
                          ? "border-primary text-primary"
                          : "border-border"
                    }`}
                    onClick={() => toggleParent(cat)}
                  >
                    {allOn ? "✓" : someOn ? "−" : ""}
                  </span>
                  <span
                    className="text-sm font-medium flex-1"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {cat.children.filter((c) => selectedIds.has(c.id)).length}/
                    {cat.children.length}
                  </span>
                </div>
                {isExpanded && (
                  <div className="pl-9 pb-2">
                    {cat.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 py-[2px] text-xs cursor-pointer hover:text-primary transition-colors"
                        onClick={() => toggleChild(child.id, cat)}
                      >
                        <span
                          className={`w-[18px] h-[18px] border-2 rounded-[3px] flex items-center justify-center text-[11px] shrink-0 transition-all ${
                            selectedIds.has(child.id)
                              ? "border-primary bg-primary text-white"
                              : "border-border"
                          }`}
                        >
                          {selectedIds.has(child.id) ? "✓" : ""}
                        </span>
                        <span>{child.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interest tags */}
      <TagSection initialTags={userTags} />

      {/* Blocked domains */}
      <BlockedDomainSection initialDomains={blockedDomains} />

      {/* Account */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
          アカウント
        </div>
        <div className="p-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-text-secondary">メール</span>
            <span>{userEmail}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-text-secondary">プラン</span>
            <span>{userPlan === "paid" ? "有料" : "無料"}</span>
          </div>
        </div>
      </div>

      {/* Save button + Feed link */}
      <div className="md:col-span-2 flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full p-3 border-none rounded-sm bg-primary text-white text-base font-medium cursor-pointer hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "保存中..." : saved ? "保存しました" : "設定を保存"}
        </button>
        <a
          href="/"
          className="block w-full p-3 text-center border border-border rounded-sm text-sm font-medium text-text hover:bg-bg-secondary transition-colors"
        >
          フィードを見る
        </a>
      </div>
    </div>
  );
}

function WeightBar({ weight, maxWeight }: { weight: number; maxWeight: number }) {
  const pct = maxWeight > 0 ? Math.min(100, (weight / maxWeight) * 100) : 0;
  return (
    <div className="w-16 h-[6px] bg-bg-tertiary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TagSection({ initialTags }: { initialTags: TagItem[] }) {
  const [tags, setTags] = useState(initialTags);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const activeTags = tags.filter((t) => !t.isExcluded);
  const excludedTags = tags.filter((t) => t.isExcluded);
  const maxWeight = Math.max(...activeTags.map((t) => t.weight), 1);

  async function handleExclude(tagId: number) {
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, weight: 0, isExcluded: true } : t))
    );
    await excludeTag(tagId);
  }

  async function handleRestore(tagId: number) {
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, isExcluded: false } : t))
    );
    await restoreTag(tagId);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchTags(query);
    const existingIds = new Set(tags.map((t) => t.id));
    setSearchResults(results.filter((r) => !existingIds.has(r.id)));
    setSearching(false);
  }

  async function handleAdd(tag: { id: number; name: string }) {
    setTags((prev) => [...prev, { ...tag, weight: 0, isExcluded: false }]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    await addTag(tag.id);
  }

  return (
    <div className="border border-border rounded-md overflow-hidden md:col-span-2">
      <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
        興味タグ
      </div>
      <div className="p-2">
        {activeTags.length === 0 && excludedTags.length === 0 && (
          <p className="text-xs text-text-tertiary py-2 px-1">
            記事をクリック・ブックマークすると、興味タグが自動的に蓄積されます。
          </p>
        )}

        {activeTags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 py-1.5 border-b border-border last:border-b-0"
          >
            <span className="text-sm flex-1 min-w-0">{tag.name}</span>
            <WeightBar weight={tag.weight} maxWeight={maxWeight} />
            <button
              onClick={() => handleExclude(tag.id)}
              className="shrink-0 w-6 h-6 flex items-center justify-center border-none bg-transparent cursor-pointer text-text-tertiary hover:text-danger text-xs transition-colors"
              aria-label={`${tag.name}を除外`}
            >
              ✕
            </button>
          </div>
        ))}

        {excludedTags.length > 0 && (
          <>
            <div className="text-[10px] text-text-tertiary py-1.5 mt-1 border-b border-border">
              ── 除外中 ──
            </div>
            {excludedTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 py-1.5 border-b border-border last:border-b-0 opacity-50"
              >
                <span className="text-sm flex-1 min-w-0">{tag.name}</span>
                <div className="w-16" />
                <button
                  onClick={() => handleRestore(tag.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center border-none bg-transparent cursor-pointer text-text-tertiary hover:text-primary text-xs transition-colors"
                  aria-label={`${tag.name}を復活`}
                >
                  ↩
                </button>
              </div>
            ))}
          </>
        )}

        {showSearch ? (
          <div className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="タグ名を入力..."
              className="w-full px-2 py-1.5 text-sm border border-border rounded-sm bg-bg"
              autoFocus
            />
            {searching && (
              <p className="text-xs text-text-tertiary py-1">検索中...</p>
            )}
            {searchResults.length > 0 && (
              <ul className="mt-1 border border-border rounded-sm overflow-hidden">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleAdd(r)}
                      className="block w-full text-left px-2 py-1.5 text-sm hover:bg-bg-secondary transition-colors bg-transparent border-none cursor-pointer"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchQuery.length > 0 && !searching && searchResults.length === 0 && (
              <p className="text-xs text-text-tertiary py-1">該当なし</p>
            )}
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
              className="mt-1 text-xs text-text-tertiary hover:text-text cursor-pointer bg-transparent border-none"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="mt-2 w-full py-1.5 border border-dashed border-border rounded-sm text-xs text-text-tertiary hover:text-text hover:border-text-tertiary cursor-pointer bg-transparent transition-colors"
          >
            + タグを追加
          </button>
        )}
      </div>
    </div>
  );
}

function BlockedDomainSection({ initialDomains }: { initialDomains: string[] }) {
  const [domains, setDomains] = useState(initialDomains);

  async function handleUnblock(domain: string) {
    setDomains((prev) => prev.filter((d) => d !== domain));
    await unblockDomain(domain);
  }

  if (domains.length === 0) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-bg-tertiary text-sm font-bold border-b border-border">
        非表示サイト
      </div>
      <div className="p-2">
        {domains.map((domain) => (
          <div
            key={domain}
            className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0"
          >
            <span className="text-sm text-text-secondary">{domain}</span>
            <button
              onClick={() => handleUnblock(domain)}
              className="shrink-0 px-2 py-0.5 text-xs border border-border rounded-sm bg-transparent cursor-pointer text-text-tertiary hover:text-text hover:border-text-tertiary transition-colors"
            >
              解除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
