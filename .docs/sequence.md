# シーケンス図

## 1. サインアップ

```mermaid
sequenceDiagram
    actor U as ブラウザ
    participant SA as Server Action
    participant NA as NextAuth
    participant DB as PostgreSQL

    U->>SA: メールアドレス + パスワード送信
    SA->>SA: Zodバリデーション
    SA->>DB: メールアドレス重複チェック
    alt 重複あり
        DB-->>SA: 既存ユーザーあり
        SA-->>U: エラー（登録済み）
    else 重複なし
        SA->>SA: パスワードハッシュ化（bcrypt）
        SA->>DB: user INSERT（password_hash, plan='free'）
        DB-->>SA: ユーザー作成完了
        SA->>DB: user_setting INSERT（デフォルト設定）
        SA->>NA: ログインセッション作成
        NA->>DB: session INSERT
        NA-->>SA: セッショントークン
        SA-->>U: 登録完了 → フィード画面（S-01）へリダイレクト
    end
```

## 2. ログイン

```mermaid
sequenceDiagram
    actor U as ブラウザ
    participant SA as Server Action
    participant NA as NextAuth
    participant DB as PostgreSQL

    U->>SA: メールアドレス + パスワード送信
    SA->>SA: Zodバリデーション
    SA->>DB: メールアドレスでユーザー検索
    alt ユーザーなし
        DB-->>SA: 該当なし
        SA-->>U: エラー（認証失敗）
    else ユーザーあり
        DB-->>SA: user（password_hash含む）
        SA->>SA: パスワード照合（bcrypt.compare）
        alt 不一致
            SA-->>U: エラー（認証失敗）
        else 一致
            SA->>NA: ログインセッション作成
            NA->>DB: session INSERT
            NA-->>SA: セッショントークン
            SA-->>U: ログイン完了 → フィード画面（S-01）へリダイレクト
        end
    end
```

## 3. パスワードリセット

```mermaid
sequenceDiagram
    actor U as ブラウザ
    participant SA as Server Action
    participant DB as PostgreSQL
    participant RS as Resend

    Note over U,RS: 申請フェーズ
    U->>SA: メールアドレス送信
    SA->>DB: メールアドレスでユーザー検索
    SA->>SA: トークン生成（有効期限: 10分）
    SA->>DB: verification_token INSERT
    SA->>RS: リセットリンクをメール送信
    RS-->>U: メール受信

    Note over U,RS: 変更フェーズ
    U->>SA: リンク押下（トークン付きURL）
    SA->>DB: トークン検索
    alt 期限切れ or 使用済み
        SA-->>U: エラー → 認証画面（S-05）へ
    else 有効
        SA-->>U: パスワード変更画面（S-06）表示
        U->>SA: 新パスワード + 確認パスワード送信
        SA->>SA: パスワード一致チェック + ハッシュ化
        SA->>DB: user UPDATE（password_hash）
        SA->>DB: verification_token DELETE（使用済み）
        SA-->>U: 変更完了 → 認証画面（S-05）へリダイレクト
    end
```

## 4. フィード取得

```mermaid
sequenceDiagram
    actor U as ブラウザ
    participant SC as Server Component
    participant DB as PostgreSQL

    U->>SC: フィード画面アクセス（cookie: カテゴリ + 配信モード）
    SC->>SC: セッション確認（NextAuth）

    alt 有料ユーザー（認証済み）
        SC->>DB: user_setting取得（配信モード）
        SC->>DB: user_category取得（カテゴリ + weight）
        SC->>DB: user_tag取得（タグ + weight）
        SC->>DB: delivery_batch_item + content取得（条件合致）
        SC->>SC: タグweight → カテゴリweight → 配信モードでスコアリング
        SC-->>U: フィード表示（スコア順）
    else 無料ユーザー（未認証）
        SC->>SC: cookieからカテゴリ + 配信モード取得
        SC->>DB: delivery_batch_item + content取得（条件合致）
        SC-->>U: フィード表示（weight適用なし）
    end
```

## 5. ユーザーアクション（デバウンス方式）

```mermaid
sequenceDiagram
    actor U as ブラウザ
    participant CL as クライアントJS
    participant SA as Server Action
    participant DB as PostgreSQL

    Note over U,DB: ブックマークトグルの例
    U->>CL: ブックマークボタンタップ
    CL->>CL: UI即時反映（楽観的更新）
    CL->>CL: デバウンスタイマー開始（500ms〜1s）

    alt 高速トグル中
        U->>CL: 再タップ
        CL->>CL: UI即時反映
        CL->>CL: タイマーリセット
    end

    Note over CL: タイマー満了
    CL->>SA: 最終状態を送信（is_bookmarked: true/false）
    SA->>SA: セッション確認（認証必須）
    SA->>DB: user_action UPSERT（べき等操作）
    DB-->>SA: 完了
    SA-->>CL: 成功応答
```

## 6. 日次バッチ

```mermaid
sequenceDiagram
    participant PY as Pythonバッチ
    participant API as 外部API/RSS
    participant DB as PostgreSQL

    Note over PY,DB: コンテンツ収集 + 配信バッチ生成
    loop 全カテゴリ × 全配信モード
        PY->>API: RSS/APIクロール
        API-->>PY: 記事データ
        PY->>DB: content UPSERT（URL一意制約、先勝ち）
        PY->>PY: タグ抽出（メタデータ優先、なければタイトル・要約から）
        PY->>DB: tag INSERT（存在しなければ）
        PY->>DB: content_tag INSERT
        PY->>DB: delivery_batch INSERT
        PY->>DB: delivery_batch_item INSERT
    end

    Note over PY,DB: 有料ユーザー性向反映（IPW）
    PY->>DB: 有料ユーザーのuser_action取得
    loop 有料ユーザーごと
        PY->>PY: IPW評価（配信weight逆数 × クリック率）
        PY->>DB: user_category.weight UPDATE（範囲: 0.2〜0.5）
        PY->>DB: user_tag.weight UPDATE（範囲: 0.2〜0.5）
    end
```
