# 日常・教養系コンテンツソースの補充

- **Status**: Open
- **Priority**: Medium
- **起票日**: 2026-05-23
- **種別**: 調査・実装

## 課題

カテゴリ「教養・ライフ」の記事が薄い。現在のソース（はてブ/Qiita/Zenn/GIGAZINE）はテクノロジー・ビジネス寄りで、以下のサブカテゴリの記事が不足している。

- 書評・読書
- 歴史・哲学
- 語学
- 生産性・習慣
- マネー

## 対応方針

### 調査が必要な項目

1. **はてブの他カテゴリRSS**: 現在はit(テクノロジー)とknowledge(知識)のみ収集。life, entertainment等のカテゴリを追加検討
2. **note**: クリエイター別RSS。有料記事フィルタ実装後に採用予定（CLAUDE.md記載）
3. **その他RSS/APIソース**: 書評サイト、マネー系メディア等で利用規約がMVP利用に適合するもの

### 制約（CLAUDE.md記載）

- 商用利用要許諾: ITmedia/@IT、マイナビニュース → 除外
- 有料記事混在: 東洋経済オンライン → 除外
- X(Twitter): 利用規約・API制限 → 対象外

## 関連

- `.investigation/001_rss_feed_sources.md` — 既存のRSSソース調査
- `batch/collect_hatena.py`, `batch/collect_qiita.py` 等 — 既存の収集バッチ
- CLAUDE.md「コンテンツソース（優先順）」セクション
