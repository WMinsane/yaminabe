"""
収集済みデータの重複排除・統合
- URL単位で重複排除
- 複数ソースに存在する場合、出現ソースをリストで保持
"""

from __future__ import annotations

import json
from datetime import datetime


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dedup(all_articles):
    """URL単位で重複排除。複数ソースに出現した場合はsourcesにまとめる"""
    seen = {}
    for article in all_articles:
        url = article["url"]
        if url in seen:
            src = article.get("source", "")
            if src and src not in seen[url]["sources"]:
                seen[url]["sources"].append(src)
        else:
            entry = {k: v for k, v in article.items() if k != "source"}
            entry["sources"] = [article.get("source", "")]
            seen[url] = entry
    return list(seen.values())


def main():
    # 収集済みデータ読み込み
    hatena = load_json("output_poc.json")
    qiita = load_json("output_qiita_api.json")

    # 全記事をフラットに展開
    all_articles = []
    for source, articles in hatena["articles"].items():
        all_articles.extend(articles)
    for tag, articles in qiita["articles"].items():
        all_articles.extend(articles)

    before = len(all_articles)
    unique = dedup(all_articles)
    after = len(unique)
    removed = before - after

    print(f"=== 重複排除 ===")
    print(f"排除前: {before}件")
    print(f"排除後: {after}件")
    print(f"除去: {removed}件 ({removed/before*100:.1f}%)")

    # 複数ソースに出現した記事
    multi = [a for a in unique if len(a["sources"]) > 1]
    if multi:
        print(f"\n--- 複数ソースに出現 ({len(multi)}件) ---")
        for a in multi[:10]:
            print(f"  - {a['title'][:55]}")
            print(f"    sources: {a['sources']}")

    # ソース別内訳
    from collections import Counter
    source_count = Counter()
    for a in unique:
        for s in a["sources"]:
            source_count[s] += 1
    print(f"\n--- ソース別ユニーク件数 ---")
    for s, c in source_count.most_common():
        print(f"  {s}: {c}件")

    output = {
        "collected_at": datetime.now().isoformat(),
        "before": before,
        "after": after,
        "removed": removed,
        "articles": unique,
    }
    with open("output_deduped.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n結果を output_deduped.json に出力しました")


if __name__ == "__main__":
    main()
