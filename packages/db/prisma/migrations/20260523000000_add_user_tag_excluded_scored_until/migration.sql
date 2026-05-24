-- user_tagにis_excluded（除外フラグ）とscored_until（バッチ処理基準日時）を追加

ALTER TABLE "user_tag" ADD COLUMN "is_excluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_tag" ADD COLUMN "scored_until" TIMESTAMPTZ;

-- weightのデフォルト値を1.00→0.00に変更
ALTER TABLE "user_tag" ALTER COLUMN "weight" SET DEFAULT 0.00;
