"""
カテゴリマスタ seed投入
6親カテゴリ + 子カテゴリ
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
    ("デザイン", "design"): [
        ("UIデザイン", "ui-design"),
        ("UXリサーチ", "ux-research"),
        ("グラフィック", "graphic"),
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
    try:
        with conn.cursor() as cur:
            # 既存データ確認
            cur.execute("SELECT COUNT(*) FROM category")
            existing = cur.fetchone()[0]
            if existing > 0:
                print("category テーブルに既に {}件のデータがあります".format(existing))
                print("スキップします（再投入する場合は TRUNCATE category CASCADE を実行してください）")
                return

            for (parent_name, parent_slug), children in CATEGORIES.items():
                cur.execute(
                    """
                    INSERT INTO category (name, slug, updated_at)
                    VALUES (%s, %s, NOW())
                    RETURNING id
                    """,
                    (parent_name, parent_slug),
                )
                parent_id = cur.fetchone()[0]
                print("親: {} (id={})".format(parent_name, parent_id))

                for child_name, child_slug in children:
                    cur.execute(
                        """
                        INSERT INTO category (parent_id, name, slug, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        RETURNING id
                        """,
                        (parent_id, child_name, child_slug),
                    )
                    child_id = cur.fetchone()[0]
                    print("  子: {} (id={})".format(child_name, child_id))

        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM category WHERE parent_id IS NULL")
            parents = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM category WHERE parent_id IS NOT NULL")
            children = cur.fetchone()[0]
        print("\n=== 投入完了 ===")
        print("親カテゴリ: {}件".format(parents))
        print("子カテゴリ: {}件".format(children))
        print("合計: {}件".format(parents + children))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
