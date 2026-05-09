import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = "password";
  const passwordHash = await bcrypt.hash(password, 10);

  const users = Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `testuser${n}`,
      email: `test${n}@example.com`,
      name: `テストユーザー${n}`,
      passwordHash,
      plan: i < 3 ? "premium" : "free",
    };
  });

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: u.passwordHash, name: u.name, plan: u.plan },
      create: u,
    });
  }

  console.log(`Seeded ${users.length} test users (password: "${password}")`);

  const banned = [
    { domain: "togetter.com", reason: "ツイートまとめサイト・記事ではない" },
    { domain: "posfie.com", reason: "ツイートまとめサイト・記事ではない" },
    { domain: "anond.hatelabo.jp", reason: "匿名投稿・質ばらつき大" },
    { domain: "www.nikkei.com", reason: "有料記事・商用利用要許諾" },
    { domain: "www.asahi.com", reason: "有料記事・商用利用要許諾" },
    { domain: "news.yahoo.co.jp", reason: "配信ニュース・短期URL・権利複雑" },
  ];
  for (const b of banned) {
    await prisma.domainBanlist.upsert({
      where: { domain: b.domain },
      update: { reason: b.reason, deletedAt: null },
      create: b,
    });
  }
  console.log(`Seeded ${banned.length} banned domains`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
