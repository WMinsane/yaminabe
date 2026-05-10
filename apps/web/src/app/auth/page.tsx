import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loginAction, signupAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "メールアドレスまたはパスワードが正しくありません",
  missing: "メールアドレスとパスワードを入力してください",
  email_invalid: "メールアドレスの形式が正しくありません",
  email_taken: "このメールアドレスは既に登録されています",
  password_short: "パスワードは8文字以上で入力してください",
  password_mismatch: "パスワードが一致しません",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string; reset?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const { error, tab, reset } = await searchParams;
  const isSignup = tab === "signup";
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-45px)] p-6">
      <div className="w-full max-w-[360px]">
        <div className="flex border-b border-border mb-6">
          <a
            href="/auth"
            className={`flex-1 text-center py-2 text-sm font-medium border-b-2 transition-colors ${
              !isSignup
                ? "border-primary text-primary"
                : "border-transparent text-text-tertiary hover:text-text"
            }`}
          >
            ログイン
          </a>
          <a
            href="/auth?tab=signup"
            className={`flex-1 text-center py-2 text-sm font-medium border-b-2 transition-colors ${
              isSignup
                ? "border-primary text-primary"
                : "border-transparent text-text-tertiary hover:text-text"
            }`}
          >
            新規登録
          </a>
        </div>

        {reset === "success" && (
          <div className="mb-4 p-2 text-sm text-green-600 border border-green-400 rounded-sm bg-bg">
            パスワードを変更しました。新しいパスワードでログインしてください。
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-2 text-sm text-error border border-error rounded-sm bg-bg">
            {errorMessage}
          </div>
        )}

        {isSignup ? <SignupForm /> : <LoginForm />}
      </div>
    </div>
  );
}

function LoginForm() {
  return (
    <form action={loginAction}>
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

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">パスワード</label>
        <input
          name="password"
          type="password"
          required
          className="w-full px-3 py-2 border border-border rounded-sm text-base bg-bg text-text focus:outline-none focus:border-primary"
          placeholder="パスワード"
        />
      </div>

      <button
        type="submit"
        className="w-full p-3 border-none rounded-sm bg-primary text-white text-base font-medium cursor-pointer hover:bg-primary-hover"
      >
        ログイン
      </button>

      <a href="/password" className="block text-center mt-4 text-xs text-primary hover:underline">
        パスワードを忘れた方
      </a>
    </form>
  );
}

function SignupForm() {
  return (
    <form action={signupAction}>
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

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">パスワード</label>
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
        アカウント作成
      </button>
    </form>
  );
}
