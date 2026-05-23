import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { prisma } from "@yaminabe/db";
import { Header } from "@/components/Header";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/session";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "闇鍋 — Yaminabe",
  description: "エコーチェンバーと成長を阻むネット環境からの脱却アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  let isDark = false;
  if (user) {
    const setting = await prisma.userSetting.findUnique({
      where: { userId: user.id },
      select: { displayMode: true },
    });
    isDark = (setting?.displayMode ?? "dark") === "dark";
  }
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full${isDark ? " dark" : ""}`}>
      <body className="min-h-full flex flex-col">
        <Header userName={user?.name ?? user?.email ?? null} />
        <main className="flex-1">{children}</main>
        {user && <ThemeToggle initialDark={isDark} />}
      </body>
    </html>
  );
}
