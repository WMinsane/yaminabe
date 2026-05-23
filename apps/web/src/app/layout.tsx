import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
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
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <Header userName={user?.name ?? user?.email ?? null} />
        <main className="flex-1">{children}</main>
        <ThemeToggle />
      </body>
    </html>
  );
}
