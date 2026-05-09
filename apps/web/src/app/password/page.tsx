import { requestResetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4">
        <div className="w-full max-w-[400px] border border-border rounded-md p-6 text-center">
          <h1 className="text-xl font-bold mb-4">メール送信完了</h1>
          <p className="text-sm text-text-secondary mb-4">
            ご登録のメールアドレスにパスワードリセットリンクを送信しました。メールをご確認ください。
          </p>
          <p className="text-xs text-text-tertiary mb-6">
            リンクの有効期限は10分です。届かない場合は迷惑メールフォルダをご確認ください。
          </p>
          <a href="/auth" className="text-sm text-primary hover:underline">
            ログイン画面に戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4">
      <div className="w-full max-w-[400px] border border-border rounded-md p-6">
        <h1 className="text-xl font-bold mb-2 text-center">パスワードリセット</h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          登録済みのメールアドレスを入力してください
        </p>

        {error === "missing" && (
          <div className="mb-4 p-2 text-sm text-error border border-error rounded-sm bg-bg">
            メールアドレスを入力してください
          </div>
        )}

        <form action={requestResetAction}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">メールアドレス</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-border rounded-sm text-base bg-bg text-text focus:outline-none focus:border-primary"
              placeholder="mail@example.com"
            />
          </div>

          <button
            type="submit"
            className="w-full p-3 border-none rounded-sm bg-primary text-white text-base font-medium cursor-pointer hover:bg-primary-hover"
          >
            リセットリンクを送信
          </button>
        </form>

        <a href="/auth" className="block text-center mt-4 text-sm text-primary hover:underline">
          ログイン画面に戻る
        </a>
      </div>
    </div>
  );
}
