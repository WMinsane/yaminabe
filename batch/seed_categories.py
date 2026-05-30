"""
カテゴリマスタ seed投入（冪等）
5親カテゴリ + 子カテゴリ
slug基準でUPSERT — 何度実行しても安全
"""

from __future__ import annotations

import os
import psycopg2

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)

CATEGORIES = {
    ("テクノロジー", "technology"): [
        ("Web開発", "web-dev"),
        ("インフラ・DevOps", "infra-devops"),
        ("AI・機械学習", "ai-ml"),
        ("セキュリティ", "security"),
        ("モバイル開発", "mobile-dev"),
    ],
    ("ビジネス・経済", "business"): [
        ("経営・戦略", "management-strategy"),
        ("マーケティング", "marketing"),
        ("投資・金融", "investment-finance"),
        ("スタートアップ", "startup"),
    ],
    ("キャリア", "career"): [
        ("転職・就活", "job-hunting"),
        ("マネジメント", "people-management"),
        ("副業・個人開発", "side-project"),
        ("働き方", "workstyle"),
    ],
    ("教養・ライフ", "culture-life"): [
        ("書評・読書", "book-review"),
        ("歴史・哲学", "history-philosophy"),
        ("語学", "language"),
        ("生産性・習慣", "productivity"),
        ("マネー", "money"),
    ],
    ("サイエンス", "science"): [
        ("物理・数学", "physics-math"),
        ("生物・医学", "biology-medicine"),
        ("データサイエンス", "data-science"),
    ],
}


def main():
    conn = psycopg2.connect(DB_URL)
    inserted = 0
    updated = 0
    try:
        with conn.cursor() as cur:
            for (parent_name, parent_slug), children in CATEGORIES.items():
                cur.execute(
                    """
                    INSERT INTO category (name, slug, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (slug) DO UPDATE SET
                        name = EXCLUDED.name,
                        updated_at = NOW()
                    RETURNING id, (xmax = 0) AS is_insert
                    """,
                    (parent_name, parent_slug),
                )
                row = cur.fetchone()
                parent_id = row[0]
                if row[1]:
                    inserted += 1
                    print("追加 親: {} (id={})".format(parent_name, parent_id))
                else:
                    updated += 1
                    print("既存 親: {} (id={})".format(parent_name, parent_id))

                for child_name, child_slug in children:
                    cur.execute(
                        """
                        INSERT INTO category (parent_id, name, slug, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (slug) DO UPDATE SET
                            name = EXCLUDED.name,
                            parent_id = EXCLUDED.parent_id,
                            updated_at = NOW()
                        RETURNING id, (xmax = 0) AS is_insert
                        """,
                        (parent_id, child_name, child_slug),
                    )
                    row = cur.fetchone()
                    if row[1]:
                        inserted += 1
                        print("  追加 子: {} (id={})".format(child_name, row[0]))
                    else:
                        updated += 1
                        print("  既存 子: {} (id={})".format(child_name, row[0]))

        conn.commit()
        print("\n=== 完了 ===")
        print("追加: {}件 / 更新: {}件".format(inserted, updated))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
