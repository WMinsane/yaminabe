import { resetPasswordAction } from "../actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "リセットリンクが無効です。もう一度お試しください。",
  expired: "リセットリンクの有効期限が切れました。もう一度お試しください。",
  password_short: "パスワードは8文字以上で入力してください",
  password_mismatch: "パスワードが一致しません",
};

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

  if (!token && !error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4">
        <div className="w-full max-w-[400px] border border-border rounded-md p-6 text-center">
          <p className="text-sm text-text-secondary mb-4">リセットリンクが無効です。</p>
          <a href="/password" className="text-sm text-primary hover:underline">
            パスワードリセットをやり直す
          </a>
        </div>
      </div>
    );
  }

  if (error === "invalid_token" || error === "expired") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4">
        <div className="w-full max-w-[400px] border border-border rounded-md p-6 text-center">
          <div className="mb-4 p-2 text-sm text-error border border-error rounded-sm bg-bg">
            {errorMessage}
          </div>
          <a href="/password" className="text-sm text-primary hover:underline">
            パスワードリセットをやり直す
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4">
      <div className="w-full max-w-[400px] border border-border rounded-md p-6">
        <h1 className="text-xl font-bold mb-6 text-center">新しいパスワードを設定</h1>

        {errorMessage && (
          <div className="mb-4 p-2 text-sm text-error border border-error rounded-sm bg-bg">
            {errorMessage}
          </div>
        )}

        <form action={resetPasswordAction}>
          <input type="hidden" name="token" value={token ?? ""} />

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">新しいパスワード</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-border rounded-sm text-base bg-bg text-text focus:outline-none focus:border-primary"
              placeholder="8文字以上"
            />
            <p className="text-xs text-text-tertiary mt-1">8文字以上</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">パスワード確認</label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-border rounded-sm text-base bg-bg text-text focus:outline-none focus:border-primary"
              placeholder="もう一度入力"
            />
          </div>

          <button
            type="submit"
            className="w-full p-3 border-none rounded-sm bg-primary text-white text-base font-medium cursor-pointer hover:bg-primary-hover"
          >
            パスワードを変更
          </button>
        </form>
      </div>
    </div>
  );
}
