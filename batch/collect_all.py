"""
Yaminabe 全ソース統合コンテンツ収集
- はてブRSS（全カテゴリ × hotentry/entrylist）
- Qiita API v2（タグ別）
- Zenn RSS（トピック別）
- @IT RSS（全フォーラム）
- ナゾロジー RSS（サイエンス系）

使い方:
  python collect_all.py              # 全ソース収集
  python collect_all.py hatena       # はてブのみ
  python collect_all.py qiita        # Qiitaのみ
  python collect_all.py zenn         # Zennのみ
  python collect_all.py atmarkit     # @ITのみ
  python collect_all.py nazology     # ナゾロジーのみ
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime

import feedparser
import requests


# ============================================================
# はてブRSS
# ============================================================

HATENA_CATEGORIES = ["it", "social", "economics", "life", "knowledge"]

def collect_hatena():
    """はてブ hotentry + entrylist × 全カテゴリ"""
    articles = []
    for cat in HATENA_CATEGORIES:
        for feed_type in ["hotentry", "entrylist"]:
            name = "hatena_{}_{}".format(feed_type, cat)
            url = "https://b.hatena.ne.jp/{}/{}.rss".format(feed_type, cat)
            arts = parse_rss(name, url)
            articles.extend(arts)
    return articles


# ============================================================
# Qiita API v2
# ============================================================

QIITA_TAGS = [
    "claude", "aws",
    "Next.js", "react", "typescript", "python",
    "docker", "terraform",
]
QIITA_PER_PAGE = 20
QIITA_MAX_PAGES = 3  # タグあたり最大60件

def collect_qiita():
    """Qiita API v2でタグ別に取得"""
    articles = []
    for tag in QIITA_TAGS:
        arts = fetch_qiita_tag(tag)
        articles.extend(arts)
    return articles


def fetch_qiita_tag(tag):
    """Qiita API v2: 単一タグの記事を取得"""
    articles = []
    for page in range(1, QIITA_MAX_PAGES + 1):
        print("  GET qiita tag:{} page={}".format(tag, page))
        resp = requests.get(
            "https://qiita.com/api/v2/items",
            params={"query": "tag:{}".format(tag), "per_page": QIITA_PER_PAGE, "page": page},
            timeout=15,
        )
        remaining = resp.headers.get("Rate-Remaining", "?")
        print("  -> {} (残り: {})".format(resp.status_code, remaining))

        if resp.status_code == 403:
            print("  ⚠ レート制限到達。Qiita収集を中断")
            return articles
        if resp.status_code != 200:
            print("  ⚠ エラー: {}".format(resp.status_code))
            break

        items = resp.json()
        if not items:
            break

        for item in items:
            articles.append({
                "title": item["title"],
                "url": item["url"],
                "published": item["created_at"],
                "summary": (item.get("body") or "")[:200],
                "likes": item["likes_count"],
                "tags": [t["name"] for t in item["tags"]],
                "user": item["user"]["id"],
                "source": "qiita_api_{}".format(tag),
            })

        # レート制限が近い場合は待機
        if remaining != "?" and int(remaining) < 5:
            print("  ⚠ レート残り少。10秒待機...")
            time.sleep(10)

    print("  qiita_{}: {}件".format(tag, len(articles)))
    return articles


# ============================================================
# @IT RSS
# ============================================================

def collect_atmarkit():
    """@IT 全フォーラムRSS"""
    return parse_rss("atmarkit", "https://rss.itmedia.co.jp/rss/2.0/ait.xml")


# ============================================================
# ナゾロジー RSS
# ============================================================

def collect_nazology():
    """ナゾロジー RSS"""
    return parse_rss("nazology", "https://nazology.kusuguru.co.jp/feed")


# ============================================================
# 共通RSS パーサー
# ============================================================

def parse_rss(name, url):
    """RSSフィードを取得・パース"""
    print("  取得中: {} ({})".format(name, url))
    feed = feedparser.parse(url)

    if feed.bozo and not feed.entries:
        print("  ⚠ パースエラー: {} - {}".format(name, feed.bozo_exception))
        return []

    articles = []
    for entry in feed.entries:
        articles.append({
            "title": entry.get("title", ""),
            "url": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": (entry.get("summary") or "")[:200],
            "source": name,
        })

    print("  -> {}件".format(len(articles)))
    return articles


# ============================================================
# メイン
# ============================================================

COLLECTORS = {
    "hatena": ("はてブ", collect_hatena),
    "qiita": ("Qiita API", collect_qiita),
    "atmarkit": ("@IT", collect_atmarkit),
    "nazology": ("ナゾロジー", collect_nazology),
}

def main():
    targets = sys.argv[1:] if len(sys.argv) > 1 else list(COLLECTORS.keys())

    print("=== Yaminabe コンテンツ収集 ===")
    print("取得日時: {}".format(datetime.now().isoformat()))
    print("対象: {}\n".format(", ".join(targets)))

    all_articles = {}
    for key in targets:
        if key not in COLLECTORS:
            print("⚠ 不明なソース: {}".format(key))
            continue
        label, collector = COLLECTORS[key]
        print("[{}]".format(label))
        articles = collector()
        all_articles[key] = articles
        print("  小計: {}件\n".format(len(articles)))

    # 集計
    total = sum(len(arts) for arts in all_articles.values())
    print("--- 集計 ---")
    for key, arts in all_articles.items():
        print("  {}: {}件".format(key, len(arts)))
    print("  合計: {}件".format(total))

    # URL重複排除
    seen = {}
    for key, arts in all_articles.items():
        for a in arts:
            url = a["url"]
            if url in seen:
                src = a.get("source", "")
                if src and src not in seen[url].setdefault("sources", []):
                    seen[url]["sources"].append(src)
            else:
                a["sources"] = [a.get("source", "")]
                seen[url] = a
    unique = list(seen.values())
    print("  重複排除後: {}件 (除去: {}件)".format(len(unique), total - len(unique)))

    # JSON出力
    output_path = "output_all.json"
    output = {
        "collected_at": datetime.now().isoformat(),
        "sources": {k: len(v) for k, v in all_articles.items()},
        "total_raw": total,
        "total_unique": len(unique),
        "articles": unique,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("\n結果を {} に出力しました".format(output_path))


if __name__ == "__main__":
    main()
