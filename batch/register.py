"""
収集済みコンテンツをPostgreSQLに登録する
- URL単位のUPSERT（重複排除）
- 出現フィードをmeta.sourcesに格納
- Qiita APIのタグ情報をcontent_tagに登録
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import execute_values, Json
from categorize import classify_by_tags, classify_by_source, classify_by_title

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)

QIITA_MIN_LIKES = 20


def connect():
    return psycopg2.connect(DB_URL)


def ensure_feed_sources(cur):
    """feed_sourceマスタを初期登録"""
    sources = [
        ("はてブ/テクノロジー(hotentry)", "https://b.hatena.ne.jp/hotentry/it.rss", "hatena"),
        ("はてブ/テクノロジー(entrylist)", "https://b.hatena.ne.jp/entrylist/it.rss", "hatena"),
        ("はてブ/知識(hotentry)", "https://b.hatena.ne.jp/hotentry/knowledge.rss", "hatena"),
        ("はてブ/知識(entrylist)", "https://b.hatena.ne.jp/entrylist/knowledge.rss", "hatena"),
        ("Qiita API/claude", "https://qiita.com/api/v2/items?query=tag:claude", "api"),
        ("Qiita API/aws", "https://qiita.com/api/v2/items?query=tag:aws", "api"),
    ]
    for name, url, type_ in sources:
        cur.execute(
            """
            INSERT INTO feed_source (name, url, type, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (url) DO NOTHING
            """,
            (name, url, type_),
        )


def ensure_tags(cur, tag_names):
    """タグをUPSERTし、name→idのマッピングを返す"""
    if not tag_names:
        return {}
    for name in tag_names:
        cur.execute(
            """
            INSERT INTO tag (name, updated_at)
            VALUES (%s, NOW())
            ON CONFLICT (name) DO NOTHING
            """,
            (name,),
        )
    cur.execute(
        "SELECT id, name FROM tag WHERE name = ANY(%s)",
        (list(tag_names),),
    )
    return {row[1]: row[0] for row in cur.fetchall()}


def load_banlist(cur):
    """domain_banlistから禁止ドメイン一覧を取得"""
    cur.execute("SELECT domain FROM domain_banlist WHERE deleted_at IS NULL")
    return {row[0] for row in cur.fetchall()}


def extract_host(url):
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""


def register_articles(cur, articles, banlist):
    """記事をUPSERT登録"""
    inserted = 0
    updated = 0
    blocked = 0
    blocked_by_domain = {}
    filtered_low_likes = 0

    for article in articles:
        url = article["url"]
        host = extract_host(url)
        if host in banlist:
            blocked += 1
            blocked_by_domain[host] = blocked_by_domain.get(host, 0) + 1
            continue

        if article.get("source", "").startswith("qiita_") and article.get("likes", 0) < QIITA_MIN_LIKES:
            filtered_low_likes += 1
            continue

        title = article["title"]
        source = article.get("source", "") or (article.get("sources", [""])[0])
        summary = article.get("summary", "")
        published_at = article.get("published") or None
        if published_at == "":
            published_at = None

        # meta: 出現ソース一覧とQiitaメタ情報
        meta = {}
        if "sources" in article:
            meta["sources"] = article["sources"]
        elif "source" in article:
            meta["sources"] = [article["source"]]
        if "likes" in article:
            meta["likes"] = article["likes"]
        if "user" in article:
            meta["author"] = article["user"]
        if "tags" in article:
            meta["tags"] = article["tags"]

        author = article.get("user")

        tags = article.get("tags", [])
        category_id = classify_by_tags(tags) or classify_by_source(source) or classify_by_title(title)

        cur.execute(
            """
            INSERT INTO content (url, title, source, summary, author, meta, category_id, published_at, collected_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                meta = content.meta || EXCLUDED.meta,
                category_id = COALESCE(content.category_id, EXCLUDED.category_id),
                updated_at = NOW()
            RETURNING (xmax = 0) AS is_insert
            """,
            (url, title, source, summary, author, Json(meta), category_id, published_at),
        )
        row = cur.fetchone()
        if row[0]:
            inserted += 1
        else:
            updated += 1

        # Qiitaタグがあればcontent_tagに登録
        tags = article.get("tags", [])
        if tags:
            cur.execute("SELECT id FROM content WHERE url = %s", (url,))
            content_id = cur.fetchone()[0]
            tag_map = ensure_tags(cur, set(tags))
            for tag_name in tags:
                tag_id = tag_map.get(tag_name)
                if tag_id:
                    cur.execute(
                        """
                        INSERT INTO content_tag (content_id, tag_id, updated_at)
                        VALUES (%s, %s, NOW())
                        ON CONFLICT (content_id, tag_id) DO NOTHING
                        """,
                        (content_id, tag_id),
                    )

    return inserted, updated, blocked, blocked_by_domain, filtered_low_likes


def load_and_flatten(path):
    """収集済みJSONを読み込み、フラットな記事リストを返す"""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    raw = data["articles"]
    if isinstance(raw, list):
        return raw
    articles = []
    for key, items in raw.items():
        articles.extend(items)
    return articles


def main():
    # デフォルトは両方読み込み
    files = sys.argv[1:] if len(sys.argv) > 1 else [
        "output_all.json",
    ]

    all_articles = []
    for path in files:
        if os.path.exists(path):
            articles = load_and_flatten(path)
            print(f"読込: {path} → {len(articles)}件")
            all_articles.extend(articles)
        else:
            print(f"⚠ ファイルなし: {path}")

    if not all_articles:
        print("登録対象なし")
        return

    # URL単位で重複排除（sources統合）
    seen = {}
    for a in all_articles:
        url = a["url"]
        if url in seen:
            src = a.get("source", "")
            if src:
                existing_sources = seen[url].setdefault("sources", [])
                if src not in existing_sources:
                    existing_sources.append(src)
        else:
            if "source" in a and "sources" not in a:
                a["sources"] = [a["source"]]
            seen[url] = a
    unique = list(seen.values())
    print(f"重複排除: {len(all_articles)} → {len(unique)}件")

    conn = connect()
    try:
        with conn.cursor() as cur:
            ensure_feed_sources(cur)
            banlist = load_banlist(cur)
            print(f"banlist: {len(banlist)}ドメイン")
            inserted, updated, blocked, blocked_by_domain, filtered_low_likes = register_articles(cur, unique, banlist)
        conn.commit()
        print(f"\n=== 登録完了 ===")
        print(f"新規: {inserted}件")
        print(f"更新: {updated}件")
        print(f"ブロック: {blocked}件")
        print(f"Qiitaいいね{QIITA_MIN_LIKES}未満除外: {filtered_low_likes}件")
        for d, n in sorted(blocked_by_domain.items(), key=lambda x: -x[1]):
            print(f"  - {d}: {n}件")

        # 確認
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM content")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM tag")
            tags = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM content_tag")
            ct = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM feed_source")
            fs = cur.fetchone()[0]
        print(f"\nDB状態:")
        print(f"  content: {total}件")
        print(f"  tag: {tags}件")
        print(f"  content_tag: {ct}件")
        print(f"  feed_source: {fs}件")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
