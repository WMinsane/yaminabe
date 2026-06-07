"""
ユーザータグweight更新バッチ
- user_actionのクリック/ブックマーク/バウンス行動からタグ興味度を算出
- user_tagのweightに加算（is_excluded=trueのタグはスキップ）
- scored_untilで差分処理（前回バッチ以降のアクションのみ対象）

使い方:
  python update_user_tags.py              # 全ユーザー
  python update_user_tags.py --dry-run    # DB更新せず結果表示のみ
"""

from __future__ import annotations

import os
import sys
from decimal import Decimal

import psycopg2

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)

SCORE_CLICK = Decimal("1.0")
SCORE_BOOKMARK = Decimal("3.0")
SCORE_BOUNCE = Decimal("-1.0")
TAG_THRESHOLD = Decimal("2.0")


def main():
    dry_run = "--dry-run" in sys.argv

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT user_id FROM user_action")
            user_ids = [r[0] for r in cur.fetchall()]

        if not user_ids:
            print("対象ユーザーなし")
            return

        print("=== ユーザータグweight更新 ===")
        print("対象ユーザー: {}人".format(len(user_ids)))
        print("モード: {}\n".format("dry-run" if dry_run else "本番"))

        total_upserted = 0
        total_skipped = 0

        for uid in user_ids:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT tag_id, weight, is_excluded, scored_until FROM user_tag WHERE user_id = %s",
                    (uid,),
                )
                existing = {}
                for tag_id, weight, is_excluded, scored_until in cur.fetchall():
                    existing[tag_id] = {
                        "weight": weight,
                        "is_excluded": is_excluded,
                        "scored_until": scored_until,
                    }

                min_scored = None
                for v in existing.values():
                    if v["scored_until"] is not None:
                        if min_scored is None or v["scored_until"] < min_scored:
                            min_scored = v["scored_until"]

                if min_scored:
                    cur.execute(
                        """
                        SELECT ct.tag_id,
                               SUM(CASE WHEN ua.is_clicked THEN 1 ELSE 0 END) AS clicks,
                               SUM(CASE WHEN ua.is_bookmarked THEN 1 ELSE 0 END) AS bookmarks,
                               SUM(CASE WHEN ua.is_bounced THEN 1 ELSE 0 END) AS bounces
                        FROM user_action ua
                        JOIN content_tag ct ON ua.content_id = ct.content_id
                        WHERE ua.user_id = %s AND ua.updated_at > %s
                        GROUP BY ct.tag_id
                        """,
                        (uid, min_scored),
                    )
                else:
                    cur.execute(
                        """
                        SELECT ct.tag_id,
                               SUM(CASE WHEN ua.is_clicked THEN 1 ELSE 0 END) AS clicks,
                               SUM(CASE WHEN ua.is_bookmarked THEN 1 ELSE 0 END) AS bookmarks,
                               SUM(CASE WHEN ua.is_bounced THEN 1 ELSE 0 END) AS bounces
                        FROM user_action ua
                        JOIN content_tag ct ON ua.content_id = ct.content_id
                        WHERE ua.user_id = %s
                        GROUP BY ct.tag_id
                        """,
                        (uid,),
                    )

                tag_scores = {}
                for tag_id, clicks, bookmarks, bounces in cur.fetchall():
                    score = (Decimal(clicks) * SCORE_CLICK
                             + Decimal(bookmarks) * SCORE_BOOKMARK
                             + Decimal(bounces) * SCORE_BOUNCE)
                    if score > 0:
                        tag_scores[tag_id] = score

            if not tag_scores:
                continue

            upserted = 0
            skipped = 0

            with conn.cursor() as cur:
                for tag_id, score in tag_scores.items():
                    if tag_id in existing:
                        if existing[tag_id]["is_excluded"]:
                            skipped += 1
                            continue
                        new_weight = existing[tag_id]["weight"] + score
                        if not dry_run:
                            cur.execute(
                                """
                                UPDATE user_tag SET weight = %s, scored_until = NOW(), updated_at = NOW()
                                WHERE user_id = %s AND tag_id = %s
                                """,
                                (new_weight, uid, tag_id),
                            )
                        upserted += 1
                    else:
                        if score >= TAG_THRESHOLD:
                            if not dry_run:
                                cur.execute(
                                    """
                                    INSERT INTO user_tag (user_id, tag_id, weight, is_excluded, scored_until, created_at, updated_at)
                                    VALUES (%s, %s, %s, false, NOW(), NOW(), NOW())
                                    ON CONFLICT (user_id, tag_id) DO UPDATE SET
                                        weight = user_tag.weight + EXCLUDED.weight,
                                        scored_until = NOW(),
                                        updated_at = NOW()
                                    """,
                                    (uid, tag_id, score),
                                )
                            upserted += 1

                if not dry_run:
                    cur.execute(
                        "UPDATE user_tag SET scored_until = NOW() WHERE user_id = %s AND is_excluded = false",
                        (uid,),
                    )

            if not dry_run:
                conn.commit()

            total_upserted += upserted
            total_skipped += skipped

            if upserted > 0 or dry_run:
                print("  user={}: 更新{}件, 除外スキップ{}件".format(uid[:8], upserted, skipped))

        print("\n=== 完了 ===")
        print("更新: {}件".format(total_upserted))
        print("除外スキップ: {}件".format(total_skipped))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
