# デザイントークン

## カラーパレット

### ライトモード

| トークン | 値 | 用途 |
|----------|-----|------|
| `--color-bg` | `#FFFFFF` | 背景 |
| `--color-bg-secondary` | `#F5F5F5` | カード背景・セクション背景 |
| `--color-bg-tertiary` | `#EBEBEB` | ホバー・アクティブ背景 |
| `--color-text` | `#1A1A1A` | 本文テキスト |
| `--color-text-secondary` | `#6B7280` | 補助テキスト（ソース・日時等） |
| `--color-text-tertiary` | `#9CA3AF` | プレースホルダ・無効テキスト |
| `--color-primary` | `#2563EB` | アクセントカラー（ボタン・リンク） |
| `--color-primary-hover` | `#1D4ED8` | プライマリホバー |
| `--color-accent` | `#F59E0B` | 強調（Newバッジ・ランキング1位等） |
| `--color-danger` | `#EF4444` | エラー・削除 |
| `--color-success` | `#10B981` | 成功・保存完了 |
| `--color-border` | `#E5E7EB` | ボーダー |
| `--color-skeleton` | `#E5E7EB` | スケルトンUI |

### ダークモード

| トークン | 値 | 用途 |
|----------|-----|------|
| `--color-bg` | `#0F0F0F` | 背景 |
| `--color-bg-secondary` | `#1A1A1A` | カード背景 |
| `--color-bg-tertiary` | `#2A2A2A` | ホバー・アクティブ背景 |
| `--color-text` | `#F0F0F0` | 本文テキスト |
| `--color-text-secondary` | `#9CA3AF` | 補助テキスト |
| `--color-text-tertiary` | `#6B7280` | プレースホルダ |
| `--color-primary` | `#3B82F6` | アクセントカラー |
| `--color-primary-hover` | `#60A5FA` | プライマリホバー |
| `--color-accent` | `#FBBF24` | 強調 |
| `--color-danger` | `#F87171` | エラー |
| `--color-success` | `#34D399` | 成功 |
| `--color-border` | `#2A2A2A` | ボーダー |
| `--color-skeleton` | `#2A2A2A` | スケルトンUI |

---

## タイポグラフィ

| トークン | 値 | 用途 |
|----------|-----|------|
| `--font-family` | `"Noto Sans JP", "Hiragino Sans", sans-serif` | 本文 |
| `--font-mono` | `"JetBrains Mono", monospace` | コード・技術情報 |
| `--font-size-xs` | `0.75rem` (12px) | バッジ・キャプション |
| `--font-size-sm` | `0.875rem` (14px) | 補助テキスト・メタ情報 |
| `--font-size-base` | `1rem` (16px) | 本文 |
| `--font-size-lg` | `1.125rem` (18px) | カードタイトル |
| `--font-size-xl` | `1.25rem` (20px) | セクション見出し |
| `--font-size-2xl` | `1.5rem` (24px) | ページタイトル |
| `--font-weight-normal` | `400` | 本文 |
| `--font-weight-medium` | `500` | 強調テキスト |
| `--font-weight-bold` | `700` | 見出し |
| `--line-height` | `1.7` | 本文（日本語最適化） |

---

## スペーシング

| トークン | 値 | 用途 |
|----------|-----|------|
| `--space-1` | `0.25rem` (4px) | 最小間隔 |
| `--space-2` | `0.5rem` (8px) | アイコンとテキスト間 |
| `--space-3` | `0.75rem` (12px) | カード内パディング（モバイル） |
| `--space-4` | `1rem` (16px) | カード内パディング |
| `--space-6` | `1.5rem` (24px) | セクション間 |
| `--space-8` | `2rem` (32px) | ページパディング |
| `--space-12` | `3rem` (48px) | セクション大間隔 |

---

## 角丸・影

| トークン | 値 | 用途 |
|----------|-----|------|
| `--radius-sm` | `0.25rem` (4px) | バッジ・チップ |
| `--radius-md` | `0.5rem` (8px) | カード・ボタン |
| `--radius-lg` | `0.75rem` (12px) | モーダル・大きなカード |
| `--radius-full` | `9999px` | アバター・円形ボタン |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | カード（フラット） |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | ホバー時のカード |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | モーダル・ドロップダウン |

---

## ブレークポイント

| トークン | 値 | 対象 |
|----------|-----|------|
| `--bp-sm` | `640px` | モバイル ↔ タブレット境界 |
| `--bp-md` | `1024px` | タブレット ↔ デスクトップ境界 |
| `--max-width` | `1280px` | コンテンツ最大幅 |

---

## トランジション

| トークン | 値 | 用途 |
|----------|-----|------|
| `--transition-fast` | `150ms ease` | ホバー・フォーカス |
| `--transition-normal` | `250ms ease` | 展開・折りたたみ |
| `--transition-slow` | `400ms ease` | ページ遷移・モーダル |
