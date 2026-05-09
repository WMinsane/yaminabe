"use client";

import { useState } from "react";
import { logoutAction } from "@/app/auth/actions";

export function Header({ userName }: { userName?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg">
      <div className="relative flex items-center gap-2 px-3 py-2">
        <button
          className="order-last lg:order-first flex flex-col gap-[5px] border-none bg-transparent p-2 cursor-pointer"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="block w-[22px] h-[2px] bg-text rounded-sm transition-colors" />
          <span className="block w-[22px] h-[2px] bg-text rounded-sm transition-colors" />
          <span className="block w-[22px] h-[2px] bg-text rounded-sm transition-colors" />
        </button>
        <a href="/" className="text-lg font-bold tracking-wide no-underline text-text hover:text-primary transition-colors">
          闇鍋
        </a>
        <div className="flex-1" />
        {userName && <span className="text-xs text-text-tertiary">{userName}</span>}
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <nav className="fixed top-0 left-0 z-50 h-full w-56 bg-bg border-r border-border shadow-lg flex flex-col lg:w-64">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">メニュー</span>
              <button
                className="border-none bg-transparent p-1 cursor-pointer text-text-tertiary hover:text-text text-lg leading-none"
                aria-label="閉じる"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <ul className="flex flex-col flex-1">
              <li>
                <a href="/" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-bg-secondary transition-colors">
                  フィード
                </a>
              </li>
              <li>
                <a href="/library" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-bg-secondary transition-colors">
                  ライブラリ
                </a>
              </li>
              <li>
                <a href="/ranking" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-bg-secondary transition-colors">
                  週次ランキング
                </a>
              </li>
              <li>
                <a href="/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-bg-secondary transition-colors">
                  ユーザー設定
                </a>
              </li>
              {userName ? (
                <li>
                  <form action={logoutAction} onSubmit={() => setMenuOpen(false)}>
                    <button
                      type="submit"
                      className="block w-full text-left px-4 py-3 text-sm hover:bg-bg-secondary transition-colors bg-transparent border-none cursor-pointer"
                    >
                      ログアウト
                    </button>
                  </form>
                </li>
              ) : (
                <li>
                  <a href="/auth" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm hover:bg-bg-secondary transition-colors">
                    ログイン
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
