"use client";

import { useState } from "react";
import { saveDisplayMode } from "@/app/actions";

export function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    saveDisplayMode(next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-[200] rounded-full border border-border bg-bg-secondary px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-bg-tertiary"
      aria-label={dark ? "ライトモードに切替" : "ダークモードに切替"}
    >
      {dark ? "明" : "暗"}
    </button>
  );
}
