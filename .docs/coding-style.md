# コーディング規約

## 前提

- 言語: TypeScript（strictモード）
- フレームワーク: Next.js（最新安定版・App Router）
- CSS: Tailwind CSS
- 認証: NextAuth（Auth.js）+ Prisma Adapter
- ORM: Prisma
- バリデーション: Zod
- 状態管理: useState → useContext → Zustand（複雑度に応じて段階的に採用）
- バックエンド境界: Server Action優先

---

## 1. フォーマット

| 項目 | ルール |
|------|--------|
| インデント | 2スペース |
| 折り返し | 100文字（設定ファイル・メッセージ文字列は500文字） |
| セミコロン | なし |
| クォート | シングルクォート |

---

## 2. ファイル・ディレクトリ命名

| 対象 | ケース | 例 |
|------|--------|-----|
| コンポーネントファイル | PascalCase | `FeedCard.tsx` |
| それ以外のファイル | camelCase | `feedService.ts`, `useBookmark.ts` |
| ディレクトリ | kebab-case | `feed-display/`, `api-routes/` |

```tsx
// NG
feed_card.tsx        // スネークケース
feed-card.tsx        // コンポーネントにケバブ
FeedService.ts       // サービスにPascalCase
feedDisplay/         // ディレクトリにcamelCase

// OK
FeedCard.tsx
feedService.ts
feed-display/
```

---

## 3. 変数・関数・定数

| 対象 | ケース | 例 |
|------|--------|-----|
| 変数・関数 | camelCase | `feedItems`, `fetchFeed()` |
| 定数（環境非依存） | UPPER_SNAKE | `MAX_FEED_COUNT` |
| 環境変数 | UPPER_SNAKE（`NEXT_PUBLIC_`プレフィックス） | `NEXT_PUBLIC_SUPABASE_URL` |
| 真偽値 | `is`/`has`/`can`プレフィックス | `isLoading`, `hasBookmark` |

```tsx
// NG
const feed_items = []
const maxFeedCount = 30
const loading = true
function FetchFeed() {}

// OK
const feedItems = []
const MAX_FEED_COUNT = 30
const isLoading = true
function fetchFeed() {}
```

---

## 4. 型定義

- `type`で統一（`interface`は使用しない）
- `any`型は禁止。型が不明な場合は`unknown`を使用

| 対象 | ケース | 例 |
|------|--------|-----|
| type | PascalCase | `FeedItem`, `UserPreferences` |
| Props型 | `{コンポーネント名}Props` | `FeedCardProps` |
| enum | PascalCase（メンバもPascalCase） | `ActionType.Clicked` |

```tsx
// NG
interface FeedItem { ... }         // interfaceは使わない
type feedItem = { ... }            // camelCase
const data: any = fetchFeed()      // any型

// OK
type FeedItem = {
  id: string
  title: string
}

type FeedCardProps = {
  item: FeedItem
}

type ActionType = 'clicked' | 'skipped' | 'bookmarked'

const data: unknown = fetchFeed()
```

---

## 5. コンポーネント

- 関数コンポーネントのみ使用（classコンポーネント禁止）
- export defaultを許可

```tsx
// NG
class FeedCard extends React.Component { ... }

// OK
export default function FeedCard({ item }: FeedCardProps) {
  return <div>{item.title}</div>
}

// OK
export function FeedCard({ item }: FeedCardProps) {
  return <div>{item.title}</div>
}
```

---

## 6. インポート順序

上から順に並べる（空行不要）:

1. 外部ライブラリ（react, next等）
2. 内部パッケージ（`@shared/`等）
3. プロジェクト内モジュール（相対パス）

```tsx
// NG: 順序バラバラ
import { FeedCard } from '../components/FeedCard'
import { useState } from 'react'
import { FeedItem } from '@shared/types'

// OK
import { useState } from 'react'
import { FeedItem } from '@shared/types'
import { FeedCard } from '../components/FeedCard'
```

---

## 7. Null/Undefinedハンドリング

- Nullish coalescing（`??`）を使用
- `!variable` でのnull/falsy判定は禁止
- 単文ifは三項演算子を推奨

```tsx
// NG
const name = user.name || 'ゲスト'   // 空文字もfalsyで落ちる
if (!user) { return null }            // !variable禁止
if (isLoggedIn) {
  return <Feed />                     // 単文ifを中括弧で書く
} else {
  return <Login />
}

// OK
const name = user.name ?? 'ゲスト'
if (user == null) { return null }
return isLoggedIn ? <Feed /> : <Login />
```

---

## 8. 状態管理

### useState

- 関連する状態はオブジェクトでまとめる。変数を1つずつ細切れに定義しない

```tsx
// NG: 細切れ定義
const [title, setTitle] = useState('')
const [url, setUrl] = useState('')
const [category, setCategory] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)

// OK: 関連する状態をまとめる
const [form, setForm] = useState({
  title: '',
  url: '',
  category: '',
})
const [isSubmitting, setIsSubmitting] = useState(false)
```

### useEffect

- 極力使用しない。バグの温床になる
- データ取得はServer Action / Route Handlerで行う
- 副作用が本当に必要な場合のみ使用し、依存配列を厳密に管理する

```tsx
// NG: useEffectでデータ取得
useEffect(() => {
  fetchFeed().then(setFeed)
}, [])

// OK: Server Componentでデータ取得
async function FeedPage() {
  const feed = await getFeed()
  return <FeedList items={feed} />
}
```

### 段階的な採用基準

| 複雑度 | 方式 |
|--------|------|
| 単一コンポーネント内の一時状態 | useState |
| 親子間で共有する状態 | props / useContext |
| 画面をまたぐ状態・グローバル状態 | Zustand |

---

## 9. Server Action

- バックエンドとの境界はServer Actionを優先
- **セキュリティ**: Server Actionは公開エンドポイントとして扱い、必ず認証チェックとバリデーションを行う

```tsx
// NG: 認証・バリデーションなし
'use server'
async function addBookmark(url: string) {
  await prisma.bookmark.create({ data: { url } })
}

// OK: 認証チェック + Zodバリデーション
'use server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const bookmarkSchema = z.object({
  url: z.string().url(),
})

async function addBookmark(input: unknown) {
  const session = await getServerSession()
  if (session == null) throw new Error('Unauthorized')

  const parsed = bookmarkSchema.safeParse(input)
  if (!parsed.success) throw new Error('Invalid input')

  try {
    await prisma.bookmark.create({
      data: { url: parsed.data.url, userId: session.user.id },
    })
  } catch (e) {
    logger.error('addBookmark failed', e)
    throw new Error('ブックマークの追加に失敗しました')
  }
}
```

---

## 10. Prisma

### トランザクション制御

複数テーブルへの書き込みが伴う処理はトランザクションで囲む。

```tsx
// NG: トランザクションなし（途中で失敗するとデータ不整合）
await prisma.feedItem.create({ data: feedData })
await prisma.userAction.create({ data: actionData })

// OK
await prisma.$transaction(async (tx) => {
  await tx.feedItem.create({ data: feedData })
  await tx.userAction.create({ data: actionData })
})
```

### クエリの書き方

- `select`で必要なカラムのみ取得する
- N+1問題を避けるため`include`は意識的に使用する

```tsx
// NG: 全カラム取得
const bookmarks = await prisma.bookmark.findMany()

// OK: 必要なカラムのみ
const bookmarks = await prisma.bookmark.findMany({
  where: { userId: session.user.id },
  select: { id: true, url: true, title: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
})
```

---

## 11. エラーハンドリング

- エラー握りつぶし禁止
- loggerでログ出力 + 呼び出し元に伝播 or ユーザーに通知

```tsx
// NG: 握りつぶし
try {
  await fetchFeed()
} catch (e) {
  console.log(e)
}

// OK: logger + 伝播
try {
  await fetchFeed()
} catch (e) {
  logger.error('fetchFeed failed', e)
  throw e
}

// OK: logger + ユーザー通知
try {
  await fetchFeed()
} catch (e) {
  logger.error('fetchFeed failed', e)
  setError('フィードの取得に失敗しました')
}
```

---

## 12. 非同期処理

- `async/await`を使用（`.then()`チェーン禁止）

```tsx
// NG
function fetchFeed() {
  return prisma.feed
    .findMany()
    .then((data) => data)
    .catch((err) => console.error(err))
}

// OK
async function fetchFeed() {
  const data = await prisma.feed.findMany()
  return data
}
```

---

## 13. Tailwind CSS

### クラスの記述順序

1. レイアウト（`flex`, `grid`, `block`）
2. サイズ（`w-`, `h-`, `p-`, `m-`）
3. 見た目（`bg-`, `text-`, `border-`, `rounded-`）
4. インタラクション（`hover:`, `focus:`, `active:`）
5. レスポンシブ（`sm:`, `md:`, `lg:`）

```tsx
// NG: 順序バラバラ
<div className="text-white hover:bg-blue-600 flex p-4 bg-blue-500 w-full">

// OK
<div className="flex w-full p-4 bg-blue-500 text-white hover:bg-blue-600">
```

### クラスの肥大化

長くなる場合は変数に切り出す。インラインに詰め込まない。

```tsx
// NG: 長すぎるインライン
<button className="flex items-center justify-center w-full h-12 px-4 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:h-10">

// OK
const buttonStyle = [
  'flex items-center justify-center',
  'w-full h-12 px-4',
  'bg-blue-500 text-white font-bold rounded-lg shadow-md',
  'hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300',
  'active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
  'sm:w-auto sm:h-10',
].join(' ')

<button className={buttonStyle}>
```

### 禁止事項

- `style`属性でのインラインCSS禁止（Tailwindで表現できないケースを除く）
- 独自CSSファイルの作成は原則禁止（globals.cssのみ許可）