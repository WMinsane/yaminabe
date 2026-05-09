"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4 text-center">
      <div className="max-w-[480px]">
        <div className="text-[5rem] font-bold text-text-tertiary leading-none mb-2">500</div>
        <h1 className="text-xl font-bold mb-3">サーバーエラー</h1>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          問題が発生しました。しばらくしてからお試しください。
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-4 py-2 border-none rounded-sm bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-hover"
          >
            リトライ
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-border rounded-sm bg-transparent text-text-secondary text-sm cursor-pointer hover:bg-bg-secondary"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
