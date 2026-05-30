"""
LLMによるカテゴリ自動付与
- DB上の未分類コンテンツ(category_id IS NULL)を取得
- Gemini Flash-Lite APIでカテゴリ判定
- content.category_id を更新

使い方:
  python autotag.py              # 未分類全件
  python autotag.py --limit 10   # 10件だけ試す
  python autotag.py --dry-run    # DB更新せず結果表示のみ
"""

from __future__ import annotations

import json
import os
import sys
import time

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent".format(GEMINI_MODEL)

BATCH_SIZE = 10  # 1回のAPI呼び出しで処理する記事数


def get_categories(cur):
    """カテゴリマスタを取得 (id -> {name, slug, parent_id})"""
    cur.execute("SELECT id, parent_id, name, slug FROM category")
    cats = {}
    for row in cur.fetchall():
        cats[row[0]] = {"parent_id": row[1], "name": row[2], "slug": row[3]}
    return cats


def get_untagged_content(cur, limit=None):
    """未分類コンテンツを取得"""
    sql = "SELECT id, title, source, summary FROM content WHERE category_id IS NULL AND deleted_at IS NULL ORDER BY id"
    if limit:
        sql += " LIMIT {}".format(limit)
    cur.execute(sql)
    return [{"id": r[0], "title": r[1], "source": r[2], "summary": r[3]} for r in cur.fetchall()]


def build_prompt(articles, categories):
    """カテゴリ分類用プロンプトを構築"""
    # 子カテゴリ一覧を作成
    cat_list = []
    for cid, cat in sorted(categories.items()):
        if cat["parent_id"] is not None:
            parent = categories[cat["parent_id"]]
            cat_list.append("id={}: {} > {}".format(cid, parent["name"], cat["name"]))

    cat_text = "\n".join(cat_list)

    articles_text = ""
    for a in articles:
        articles_text += "id={} | {} | {}\n".format(
            a["id"],
            a["title"],
            (a["summary"] or "")[:100],
        )

    prompt = """以下の記事リストを、指定されたカテゴリに分類してください。

## カテゴリ一覧（子カテゴリのidを返してください）
{}

## 記事リスト
{}

## 出力形式
JSON配列で返してください。他のテキストは不要です。
[{{"content_id": 1, "category_id": 2}}, ...]

- 必ず子カテゴリのidを指定してください
- 複数カテゴリに該当する場合は最も適切な1つを選んでください
- どのカテゴリにも該当しない場合は category_id を null にしてください
- 政治・政策・外交・選挙に関する記事はビジネス・経済カテゴリに分類しないでください（category_id を null にしてください）
- Python一般の記事をデータサイエンスに分類しないでください。Web開発やインフラなど実際の内容に合ったカテゴリを選んでください
- 「ルール」「制度」等のキーワードだけで働き方・キャリアに分類しないでください。記事の主題で判断してください""".format(cat_text, articles_text)

    return prompt


MAX_RETRIES = 3

def call_gemini(prompt):
    """Gemini API呼び出し（リトライ付き）"""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                GEMINI_URL,
                params={"key": GEMINI_API_KEY},
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json",
                    },
                },
                timeout=30,
            )
        except requests.exceptions.Timeout:
            wait = 2 ** attempt
            print("  ⚠ タイムアウト (試行{}/{}) {}秒後にリトライ".format(attempt, MAX_RETRIES, wait))
            if attempt == MAX_RETRIES:
                print("  ✗ 最大リトライ回数到達")
                return None
            time.sleep(wait)
            continue

        if resp.status_code == 429 or resp.status_code >= 500:
            wait = 2 ** attempt
            print("  ⚠ APIエラー {} (試行{}/{}) {}秒後にリトライ".format(resp.status_code, attempt, MAX_RETRIES, wait))
            if attempt == MAX_RETRIES:
                print("  ✗ 最大リトライ回数到達: {}".format(resp.text[:200]))
                return None
            time.sleep(wait)
            continue

        if resp.status_code != 200:
            print("  ⚠ Gemini APIエラー: {} {}".format(resp.status_code, resp.text[:200]))
            return None

        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            print("  ⚠ JSONパースエラー: {}".format(text[:200]))
            return None

    return None


def main():
    if not GEMINI_API_KEY:
        print("エラー: GEMINI_API_KEY が設定されていません")
        print("batch/.env に GEMINI_API_KEY=xxx を記述してください")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv
    limit = None
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            categories = get_categories(cur)
            articles = get_untagged_content(cur, limit)

        if not articles:
            print("未分類コンテンツなし")
            return

        print("=== LLMカテゴリ自動付与 ===")
        print("対象: {}件".format(len(articles)))
        print("モード: {}".format("dry-run" if dry_run else "本番"))
        print("モデル: {}\n".format(GEMINI_MODEL))

        total_updated = 0
        total_null = 0
        total_error = 0

        # バッチ処理
        for i in range(0, len(articles), BATCH_SIZE):
            batch = articles[i:i + BATCH_SIZE]
            print("バッチ {}/{} ({}件)".format(
                i // BATCH_SIZE + 1,
                (len(articles) + BATCH_SIZE - 1) // BATCH_SIZE,
                len(batch),
            ))

            prompt = build_prompt(batch, categories)
            results = call_gemini(prompt)

            if results is None:
                total_error += len(batch)
                continue

            # 結果を適用
            result_map = {r["content_id"]: r.get("category_id") for r in results}

            for a in batch:
                cat_id = result_map.get(a["id"])
                if cat_id and cat_id in categories:
                    cat = categories[cat_id]
                    parent = categories.get(cat["parent_id"], {})
                    print("  [{}] {} -> {} > {}".format(a["id"], a["title"][:40], parent.get("name", "?"), cat["name"]))

                    if not dry_run:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE content SET category_id = %s, updated_at = NOW() WHERE id = %s",
                                (cat_id, a["id"]),
                            )
                    total_updated += 1
                else:
                    print("  [{}] {} -> 分類不能".format(a["id"], a["title"][:40]))
                    total_null += 1

            if not dry_run:
                conn.commit()

            # レート制限対策（15 RPM for free tier）
            if i + BATCH_SIZE < len(articles):
                time.sleep(4)

        print("\n=== 完了 ===")
        print("分類成功: {}件".format(total_updated))
        print("分類不能: {}件".format(total_null))
        print("エラー: {}件".format(total_error))

        if not dry_run:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM content WHERE category_id IS NOT NULL")
                tagged = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM content WHERE category_id IS NULL")
                untagged = cur.fetchone()[0]
            print("\nDB状態:")
            print("  分類済み: {}件".format(tagged))
            print("  未分類: {}件".format(untagged))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
