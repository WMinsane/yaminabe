import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-45px)] p-4 text-center">
      <div className="max-w-[480px]">
        <div className="text-[5rem] font-bold text-text-tertiary leading-none mb-2">404</div>
        <h1 className="text-xl font-bold mb-3">ページが見つかりません</h1>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 border-none rounded-sm bg-primary text-white text-sm font-medium hover:bg-primary-hover"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
