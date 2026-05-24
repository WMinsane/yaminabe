# 行動学習タグのユーザー管理機能

- **Status**: Open（設計確定・実装待ち）
- **Priority**: High
- **起票日**: 2026-05-23
- **種別**: 仕様検討 → 設計確定

## 課題

タグが有効に活用されていない。

- 行動学習（クリック/ブックマーク）でタグ興味度を算出しているが、結果が不透明でユーザーが管理できない
- タグがQiita記事にしかなく、hatena/Zenn/GIGAZINE記事はタグ未付与
- `user_tag`テーブルは存在するが未使用
- 配信モード「集中(deep)」等がタグデータ不足で実質機能しない

## 確定仕様

### タグの状態遷移

```
[未登録] → バッチで閾値超過 → [アクティブ] weight加算
                                    ↓ ユーザー除外
                                [除外] weight=0、加算停止、UI上で除外表示
                                    ↓ ユーザー手動復活
                                [アクティブ] weight=0から再開、加算再開
```

- **除外中はアクションがあっても加算しない**（勝手に復活するとユーザーに不信感）
- **復活は必ずユーザーの手動操作**
- **weightの調整はユーザーが行わない**（システムが管理）

### 1. DB変更

#### user_tagスキーマ変更

| カラム | 型 | 説明 |
|--------|-----|------|
| is_excluded | BOOLEAN, DEFAULT false | 除外フラグ。trueなら加算停止・UI上で除外表示 |
| scored_until | TIMESTAMPTZ, NULL | 前回バッチで処理済みのアクション日時。差分加算の基準 |

#### autotagによる全ソースタグ付与

Qiita以外の記事にもタグを付与する。

- `autotag.py`を拡張: カテゴリ分類 + タグ付与（3〜5個）を1回のGemini API呼び出しで実施
- 出力形式: `[{"content_id": 1, "category_id": 2, "tags": ["Python", "AWS", ...]}]`
- Qiita記事: 元タグがあるのでタグ付与スキップ
- タグはtagテーブルにUPSERT、content_tagに紐付け

### 2. バッチ処理: `batch/update_user_tags.py`（新規）

日次バッチ末尾に追加（collect → register → autotag → **update_user_tags**）。

```
処理フロー:
1. ユーザーごとに、scored_until以降のuser_actionを取得
2. user_action × content_tag をJOINし、タグごとにスコア算出
   - click: +1, bookmark: +3, bounce: -1
3. user_tagの既存レコードと照合
   - is_excluded=true → スキップ（加算しない）
   - is_excluded=false → weightに加算
   - レコードなし → スコアが閾値以上ならINSERT
4. scored_untilを更新
```

### 3. スコアリング変更: `lib/scoring.ts`

`buildTagAffinity()`を変更: user_actionからの毎回計算 → user_tagのweightを直接読み出し。

```typescript
// Before: user_action全件なめて計算
// After: user_tagから読むだけ
async function buildTagAffinity(userId: string): Promise<Map<number, number>> {
  const tags = await prisma.userTag.findMany({
    where: { userId, isExcluded: false, deletedAt: null },
    select: { tagId: true, weight: true },
  });
  // weightを正規化して返す
}
```

### 4. サーバーアクション（actions.ts追加）

| アクション | 処理 |
|-----------|------|
| `getUserTags()` | user_tagをweight降順で取得（除外タグも含む） |
| `excludeTag(tagId)` | weight=0, is_excluded=true に更新 |
| `restoreTag(tagId)` | is_excluded=false に更新（weight=0のまま、次のバッチから加算再開） |
| `addTag(tagId)` | user_tagにINSERT（weight=0, is_excluded=false）。次のバッチから加算開始 |

### 5. 設定画面UI

設定画面の「興味カテゴリ」の下に「興味タグ」セクションを追加。

```
┌─────────────────────────────┐
│ 興味タグ                     │
├─────────────────────────────┤
│ Python        ████████  [×] │  ← アクティブ（×で除外）
│ AWS           ██████    [×] │
│ Docker        ████      [×] │
│ React         ██        [×] │
│ ── 除外中 ──                │
│ 占い          ─         [↩] │  ← 除外（↩で復活）
│ 恋愛          ─         [↩] │
├─────────────────────────────┤
│ [+ タグを追加]               │  ← 手動追加（tagテーブルから検索選択）
└─────────────────────────────┘
```

- weightをバーで視覚表示（数値は見せない）
- 除外タグはグレーアウト + 復活ボタン
- 手動追加時はweight=0（加算待ち状態）
- 手動追加タグも次のバッチで加算開始

## 実装順序

1. DB: user_tagに`is_excluded`, `scored_until`カラム追加（マイグレーション）
2. autotag.py拡張: 全ソースにタグ付与
3. update_user_tags.py: タグ加算バッチ新規作成
4. scoring.ts: buildTagAffinityをuser_tag参照に変更
5. actions.ts: タグ管理アクション追加
6. SettingsView.tsx: タグ管理UI追加
7. batch-daily.yml: update_user_tagsステップ追加

## 関連

- `.issue/004_llm_tag_misclassification.md` — タグ自動付与の精度（autotagでタグ付与する際の品質に影響）
- `user_tag`: `user_id` + `tag_id` + `weight`(Decimal 5,2) + `is_excluded`(新規) + `scored_until`(新規)
- `buildTagAffinity()`: `lib/scoring.ts` — 変更対象
- `SettingsView.tsx`: カテゴリ選択UIのパターンを踏襲
