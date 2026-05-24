-- 既存の行動データ(user_action)からuser_tagを初期生成
-- click: +1, bookmark: +3, bounce: -1
-- スコア1以上のタグのみ登録

INSERT INTO user_tag (user_id, tag_id, weight, is_excluded, scored_until, created_at, updated_at)
SELECT
  ua.user_id,
  ct.tag_id,
  LEAST(999.99, SUM(
    CASE WHEN ua.is_clicked THEN 1 ELSE 0 END
    + CASE WHEN ua.is_bookmarked THEN 3 ELSE 0 END
    - CASE WHEN ua.is_bounced THEN 1 ELSE 0 END
  ))::numeric(5,2) AS weight,
  false AS is_excluded,
  NOW() AS scored_until,
  NOW() AS created_at,
  NOW() AS updated_at
FROM user_action ua
JOIN content_tag ct ON ct.content_id = ua.content_id
WHERE ua.deleted_at IS NULL
  AND ct.deleted_at IS NULL
GROUP BY ua.user_id, ct.tag_id
HAVING SUM(
  CASE WHEN ua.is_clicked THEN 1 ELSE 0 END
  + CASE WHEN ua.is_bookmarked THEN 3 ELSE 0 END
  - CASE WHEN ua.is_bounced THEN 1 ELSE 0 END
) >= 1
ON CONFLICT (user_id, tag_id) DO UPDATE SET
  weight = EXCLUDED.weight,
  scored_until = EXCLUDED.scored_until,
  updated_at = NOW();
