"""
ルールベースのカテゴリ自動分類
- タグ → カテゴリのマッピングで高速分類（API不要）
- ソース名によるフォールバック
- タイトルキーワードによるフォールバック
- 分類できなかったものは autotag.py (Gemini) に委ねる

使い方:
  python categorize.py              # 未分類全件
  python categorize.py --dry-run    # DB更新せず結果表示のみ
"""

from __future__ import annotations

import os
import re

import psycopg2

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://yaminabe:yaminabe_dev_pass@localhost:5433/yaminabe_dev",
)

# --- カテゴリID定数 ---
CAT_WEB = 2            # Web開発
CAT_INFRA = 3          # インフラ・DevOps
CAT_AI = 4             # AI・機械学習
CAT_SECURITY = 5       # セキュリティ
CAT_MOBILE = 6         # モバイル開発
CAT_MANAGEMENT = 8     # 経営・戦略
CAT_MARKETING = 9      # マーケティング
CAT_FINANCE = 10       # 投資・金融
CAT_STARTUP = 11       # スタートアップ
CAT_UIDESIGN = 13      # UIデザイン
CAT_UXRESEARCH = 14    # UXリサーチ
CAT_GRAPHIC = 15       # グラフィック
CAT_CAREER = 17        # 転職・就活
CAT_MGMT_CAREER = 18   # マネジメント
CAT_SIDE_PROJECT = 19  # 副業・個人開発
CAT_WORKSTYLE = 20     # 働き方
CAT_BOOK = 22          # 書評・読書
CAT_HISTORY = 23       # 歴史・哲学
CAT_LANGUAGE = 24      # 語学
CAT_PRODUCTIVITY = 25  # 生産性・習慣
CAT_MONEY = 26         # マネー
CAT_PHYSICS = 28       # 物理・数学
CAT_BIOLOGY = 29       # 生物・医学
CAT_DATASCIENCE = 30   # データサイエンス

# --- タグ → カテゴリ マッピング（小文字で照合） ---
TAG_MAP: dict[str, int] = {}

def _reg(cat_id: int, *tags: str):
    for t in tags:
        TAG_MAP[t.lower()] = cat_id

_reg(CAT_AI,
     "ai", "llm", "claude", "chatgpt", "openai", "anthropic", "gemini",
     "機械学習", "deeplearning", "生成ai", "aiエージェント", "aiagent",
     "ai駆動開発", "ai活用", "mcp", "bedrock", "rlhf", "プロンプト",
     "プロンプトエンジニアリング", "openclaw", "agentcore", "agent",
     "claudecode", "claude_md", "sonnet46", "geminiapi", "codex",
     "githubcopilot", "n8n")
_reg(CAT_WEB,
     "react", "next.js", "typescript", "javascript", "vue.js", "node.js",
     "フロントエンド", "css", "html", "vite", "hono", "bun", "npm",
     "approuter", "usestate", "useeffect", "express", "axios",
     "tailwindcss", "laravel", "php", "web制作", "fastapi",
     "supabase", "postgresql", "mysql", "sql", "database")
_reg(CAT_INFRA,
     "aws", "docker", "terraform", "kubernetes", "devops", "linux",
     "iac", "github", "githubactions", "ec2", "ecs", "s3", "lambda",
     "cloudwatch", "cloudformation", "hcpterraform", "eks",
     "docker-compose", "dockercompose", "container", "ansible",
     "cicd", "sre", "conoha", "conoha-cli", "amplify",
     "googlecloud", "azure", "cloudflareworkers", "環境構築",
     "開発環境", "wsl2", "unix", "ubuntu", "git", "cli", "lpic",
     "インフラ", "go", "rust")
_reg(CAT_SECURITY,
     "security", "脆弱性", "セキュリティ", "iam")
_reg(CAT_MOBILE,
     "swift", "flutter", "reactnative", "kotlin", "ios", "android")
_reg(CAT_DATASCIENCE,
     "データサイエンス", "データ分析", "snowflake", "numpy",
     "python3", "pandas", "scipy", "r言語")
_reg(CAT_UIDESIGN,
     "uidesign", "figma", "uiデザイン", "デザインシステム")
_reg(CAT_UXRESEARCH,
     "uxリサーチ", "ux", "ユーザビリティ")
_reg(CAT_GRAPHIC,
     "グラフィック", "イラスト", "フォント", "アイコン")
_reg(CAT_MARKETING,
     "マーケティング", "seo", "広告", "sns運用")
_reg(CAT_FINANCE,
     "投資", "金融", "株", "仮想通貨", "fintech")
_reg(CAT_STARTUP,
     "スタートアップ", "起業", "producthunt")
_reg(CAT_SIDE_PROJECT,
     "個人開発", "副業", "ポートフォリオ")
_reg(CAT_CAREER,
     "転職", "就活", "新人プログラマ応援", "初学者向け")
_reg(CAT_MGMT_CAREER,
     "マネジメント", "チーム", "リーダーシップ", "1on1")
_reg(CAT_WORKSTYLE,
     "働き方", "リモートワーク", "フリーランス")
_reg(CAT_PRODUCTIVITY,
     "生産性", "タスク管理", "ライフハック", "vscode", "開発効率化",
     "便利ツール", "自動化", "mac", "windows", "excel")
_reg(CAT_BOOK,
     "書評", "読書", "本")
_reg(CAT_HISTORY,
     "歴史", "哲学")
_reg(CAT_LANGUAGE,
     "英語", "語学", "toeic")
_reg(CAT_BIOLOGY,
     "医学", "看護師", "生物", "バイオ")
_reg(CAT_PHYSICS,
     "物理", "数学", "量子")

# python は曖昧（AI/Web/データサイエンス）なのでタグ単独では判定しない


# --- ソース名 → カテゴリ（タグなし時のフォールバック）---
SOURCE_MAP: list[tuple[str, int]] = [
    ("qiita_api_claude", CAT_AI),
    ("qiita_claude", CAT_AI),
    ("zenn_ai", CAT_AI),
    ("qiita_api_aws", CAT_INFRA),
    ("qiita_aws", CAT_INFRA),
    ("zenn_aws", CAT_INFRA),
    ("zenn_devops", CAT_INFRA),
    ("zenn_docker", CAT_INFRA),
    ("qiita_api_docker", CAT_INFRA),
    ("zenn_terraform", CAT_INFRA),
    ("qiita_api_terraform", CAT_INFRA),
    ("qiita_api_react", CAT_WEB),
    ("zenn_react", CAT_WEB),
    ("qiita_api_Next.js", CAT_WEB),
    ("zenn_nextjs", CAT_WEB),
    ("qiita_api_typescript", CAT_WEB),
    ("zenn_typescript", CAT_WEB),
    ("zenn_security", CAT_SECURITY),
    ("zenn_python", CAT_DATASCIENCE),
    ("qiita_api_python", CAT_AI),
    ("hatena_hotentry_economics", CAT_MANAGEMENT),
    ("hatena_entrylist_economics", CAT_MANAGEMENT),
    ("hatena_hotentry_social", CAT_WORKSTYLE),
    ("hatena_entrylist_social", CAT_WORKSTYLE),
]

# --- タイトルキーワード → カテゴリ（最終フォールバック）---
TITLE_RULES: list[tuple[re.Pattern, int]] = [
    (re.compile(r"\bLLM\b|ChatGPT|Gemini\b|機械学習|生成AI|プロンプト|GPT-|大規模言語", re.I), CAT_AI),
    (re.compile(r"React|Next\.js|TypeScript|Vue\.js|フロントエンド|Laravel|PHP\b", re.I), CAT_WEB),
    (re.compile(r"\bAWS\b|Docker|Terraform|Kubernetes|k8s|CI/CD|インフラ|DevOps|Linux|サーバー構築", re.I), CAT_INFRA),
    (re.compile(r"セキュリティ|脆弱性|XSS|CSRF|マルウェア|ゼロデイ|不正アクセス", re.I), CAT_SECURITY),
    (re.compile(r"iOS|Android|Swift|Flutter|アプリ開発", re.I), CAT_MOBILE),
    (re.compile(r"データ分析|統計|機械学習|データサイエンス", re.I), CAT_DATASCIENCE),
    (re.compile(r"UIデザイン|UXデザイン|Figma|デザインシステム", re.I), CAT_UIDESIGN),
    (re.compile(r"マーケティング|SEO|広告|集客", re.I), CAT_MARKETING),
    (re.compile(r"投資|金融|株|経済|為替", re.I), CAT_FINANCE),
    (re.compile(r"経営|戦略|ビジネス|DX|組織", re.I), CAT_MANAGEMENT),
    (re.compile(r"スタートアップ|起業|資金調達", re.I), CAT_STARTUP),
    (re.compile(r"転職|就活|キャリア|年収", re.I), CAT_CAREER),
    (re.compile(r"マネジメント|リーダー|チーム|1on1", re.I), CAT_MGMT_CAREER),
    (re.compile(r"働き方|リモート|テレワーク|フリーランス", re.I), CAT_WORKSTYLE),
    (re.compile(r"個人開発|副業|ポートフォリオ", re.I), CAT_SIDE_PROJECT),
    (re.compile(r"書評|読書|本を|おすすめ本", re.I), CAT_BOOK),
    (re.compile(r"歴史|哲学|思想|倫理", re.I), CAT_HISTORY),
    (re.compile(r"英語|TOEIC|語学|翻訳", re.I), CAT_LANGUAGE),
    (re.compile(r"生産性|習慣|ライフハック|効率化|タスク管理", re.I), CAT_PRODUCTIVITY),
    (re.compile(r"医学|医療|看護|健康|病気", re.I), CAT_BIOLOGY),
    (re.compile(r"物理|数学|量子|素粒子", re.I), CAT_PHYSICS),
]


def classify_by_tags(tag_names: list[str]) -> int | None:
    """タグリストからカテゴリを推定（多数決）"""
    if not tag_names:
        return None
    votes: dict[int, int] = {}
    for t in tag_names:
        cat = TAG_MAP.get(t.lower())
        if cat:
            votes[cat] = votes.get(cat, 0) + 1
    if not votes:
        return None
    return max(votes, key=lambda k: votes[k])


def classify_by_source(source: str) -> int | None:
    """ソース名からカテゴリを推定"""
    for prefix, cat_id in SOURCE_MAP:
        if source == prefix or source.startswith(prefix):
            return cat_id
    return None


def classify_by_title(title: str) -> int | None:
    """タイトルキーワードからカテゴリを推定"""
    for pattern, cat_id in TITLE_RULES:
        if pattern.search(title):
            return cat_id
    return None


def main():
    import sys
    dry_run = "--dry-run" in sys.argv

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.title, c.source,
                       ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) AS tags
                FROM content c
                LEFT JOIN content_tag ct ON c.id = ct.content_id
                LEFT JOIN tag t ON ct.tag_id = t.id
                WHERE c.category_id IS NULL AND c.deleted_at IS NULL
                GROUP BY c.id
                ORDER BY c.id
            """)
            rows = cur.fetchall()

        if not rows:
            print("未分類コンテンツなし")
            return

        print(f"=== ルールベース カテゴリ分類 ===")
        print(f"対象: {len(rows)}件")
        print(f"モード: {'dry-run' if dry_run else '本番'}\n")

        # カテゴリ名マップ
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM category")
            cat_names = {r[0]: r[1] for r in cur.fetchall()}

        classified = 0
        by_method = {"tag": 0, "source": 0, "title": 0}
        remaining = 0
        updates: list[tuple[int, int]] = []

        for cid, title, source, tags in rows:
            tag_list = tags if tags else []

            cat_id = classify_by_tags(tag_list)
            method = "tag"

            if cat_id is None:
                cat_id = classify_by_source(source or "")
                method = "source"

            if cat_id is None:
                cat_id = classify_by_title(title or "")
                method = "title"

            if cat_id is not None:
                classified += 1
                by_method[method] += 1
                updates.append((cat_id, cid))
                if dry_run:
                    print(f"  [{cid}] {cat_names.get(cat_id, '?')} ({method}) ← {title[:50]}")
            else:
                remaining += 1
                if dry_run:
                    t_str = ", ".join(tag_list[:3]) if tag_list else "-"
                    print(f"  [{cid}] 分類不能 ({source}, tags={t_str}) ← {title[:50]}")

        if not dry_run and updates:
            with conn.cursor() as cur:
                for cat_id, cid in updates:
                    cur.execute(
                        "UPDATE content SET category_id = %s, updated_at = NOW() WHERE id = %s",
                        (cat_id, cid),
                    )
            conn.commit()

        print(f"\n=== 完了 ===")
        print(f"分類成功: {classified}件")
        print(f"  タグ: {by_method['tag']}件")
        print(f"  ソース: {by_method['source']}件")
        print(f"  タイトル: {by_method['title']}件")
        print(f"分類不能（autotag.py委託）: {remaining}件")

        if not dry_run:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM content WHERE category_id IS NOT NULL AND deleted_at IS NULL")
                tagged = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM content WHERE category_id IS NULL AND deleted_at IS NULL")
                untagged = cur.fetchone()[0]
            print(f"\nDB状態:")
            print(f"  分類済み: {tagged}件")
            print(f"  未分類: {untagged}件")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
