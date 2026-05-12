"""
Qiitaいいね数が閾値未満の既存記事をDBから削除する（ワンショット）
関連する content_tag, user_action も事前削除
"""

from __future__ import annotations

import os
import psycopg2

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)

QIITA_MIN_LIKES = 20


def main():
    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, (meta->>'likes')::int AS likes
                FROM content
                WHERE source LIKE 'qiita_%%'
                  AND (meta->>'likes')::int < %s
                  AND deleted_at IS NULL
                """,
                (QIITA_MIN_LIKES,),
            )
            rows = cur.fetchall()

            if not rows:
                print("削除対象なし")
                return

            ids = [r[0] for r in rows]
            print(f"削除対象: {len(ids)}件")
            for r in rows:
                print(f"  id={r[0]} likes={r[2]} {r[1][:60]}")

            cur.execute("DELETE FROM content_tag WHERE content_id = ANY(%s)", (ids,))
            ct_del = cur.rowcount
            cur.execute("DELETE FROM user_action WHERE content_id = ANY(%s)", (ids,))
            ua_del = cur.rowcount
            cur.execute("DELETE FROM content WHERE id = ANY(%s)", (ids,))
            c_del = cur.rowcount

        conn.commit()
        print(f"\n=== 削除完了 ===")
        print(f"content: {c_del}件")
        print(f"content_tag: {ct_del}件")
        print(f"user_action: {ua_del}件")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
