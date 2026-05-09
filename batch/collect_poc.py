"""
Yaminabe コンテンツ収集PoC
- はてブRSS（hotentry/entrylist × カテゴリ）
- Qiita RSS（タグ別）
"""

from __future__ import annotations

import json
import sys
from datetime import datetime

import feedparser


# --- ソース定義 ---

HATENA_FEEDS = {
    "hatena_hotentry_it": "https://b.hatena.ne.jp/hotentry/it.rss",
    "hatena_hotentry_knowledge": "https://b.hatena.ne.jp/hotentry/knowledge.rss",
    "hatena_entrylist_it": "https://b.hatena.ne.jp/entrylist/it.rss",
    "hatena_entrylist_knowledge": "https://b.hatena.ne.jp/entrylist/knowledge.rss",
}

QIITA_FEEDS = {
    "qiita_claude": "https://qiita.com/tags/claude/feed.atom",
    "qiita_aws": "https://qiita.com/tags/aws/feed.atom",
}

ALL_FEEDS = {**HATENA_FEEDS, **QIITA_FEEDS}


def parse_feed(name: str, url: str) -> list[dict]:
    """RSSフィードを取得・パースし、記事リストを返す"""
    print(f"  取得中: {name} ({url})")
    feed = feedparser.parse(url)

    if feed.bozo and not feed.entries:
        print(f"  ⚠ パースエラー: {name} - {feed.bozo_exception}")
        return []

    articles = []
    for entry in feed.entries:
        article = {
            "title": entry.get("title", ""),
            "url": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": entry.get("summary", "")[:200] if entry.get("summary") else "",
            "source": name,
        }
        articles.append(article)

    print(f"  → {len(articles)}件取得")
    return articles


def main():
    results = {}
    total = 0

    # 対象フィード選択（引数で絞り込み可能）
    targets = ALL_FEEDS
    if len(sys.argv) > 1:
        key = sys.argv[1]
        if key == "hatena":
            targets = HATENA_FEEDS
        elif key == "qiita":
            targets = QIITA_FEEDS
        elif key in ALL_FEEDS:
            targets = {key: ALL_FEEDS[key]}

    print(f"=== Yaminabe コンテンツ収集PoC ===")
    print(f"取得日時: {datetime.now().isoformat()}")
    print(f"対象: {len(targets)}フィード\n")

    for name, url in targets.items():
        articles = parse_feed(name, url)
        results[name] = articles
        total += len(articles)

    print(f"\n--- 集計 ---")
    for name, articles in results.items():
        print(f"  {name}: {len(articles)}件")
    print(f"  合計: {total}件")

    # JSON出力
    output_path = "output_poc.json"
    output = {
        "collected_at": datetime.now().isoformat(),
        "summary": {name: len(arts) for name, arts in results.items()},
        "total": total,
        "articles": results,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n結果を {output_path} に出力しました")


if __name__ == "__main__":
    main()
