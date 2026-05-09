"""
Qiita API v2 PoC
認証なし: 60req/h
GET /api/v2/items?query=tag:{tag}&per_page=20&page=1
"""

from __future__ import annotations

import json
import sys
from datetime import datetime

import requests

TAGS = ["claude", "aws"]
PER_PAGE = 20
MAX_PAGES = 3  # タグあたり最大60件


def fetch_by_tag(tag: str) -> list[dict]:
    articles = []
    for page in range(1, MAX_PAGES + 1):
        url = "https://qiita.com/api/v2/items"
        params = {
            "query": f"tag:{tag}",
            "per_page": PER_PAGE,
            "page": page,
        }
        print(f"  GET {url} tag:{tag} page={page}")
        resp = requests.get(url, params=params, timeout=15)
        print(f"  → {resp.status_code} (残りリクエスト: {resp.headers.get('Rate-Remaining', '?')})")

        if resp.status_code != 200:
            print(f"  ⚠ エラー: {resp.status_code}")
            break

        items = resp.json()
        if not items:
            break

        for item in items:
            articles.append({
                "title": item["title"],
                "url": item["url"],
                "published": item["created_at"],
                "updated": item["updated_at"],
                "likes": item["likes_count"],
                "tags": [t["name"] for t in item["tags"]],
                "user": item["user"]["id"],
                "summary": (item.get("body") or "")[:200],
                "source": f"qiita_api_{tag}",
            })

    return articles


def main():
    tags = sys.argv[1:] if len(sys.argv) > 1 else TAGS
    results = {}
    total = 0

    print(f"=== Qiita API v2 PoC ===")
    print(f"取得日時: {datetime.now().isoformat()}")
    print(f"対象タグ: {tags}\n")

    for tag in tags:
        articles = fetch_by_tag(tag)
        results[tag] = articles
        total += len(articles)
        print(f"  {tag}: {len(articles)}件\n")

    print(f"--- 集計 ---")
    for tag, articles in results.items():
        print(f"  {tag}: {len(articles)}件")
    print(f"  合計: {total}件")

    output_path = "output_qiita_api.json"
    output = {
        "collected_at": datetime.now().isoformat(),
        "summary": {tag: len(arts) for tag, arts in results.items()},
        "total": total,
        "articles": results,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n結果を {output_path} に出力しました")


if __name__ == "__main__":
    main()
