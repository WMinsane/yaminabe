import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@yaminabe/db";
import { randomUUID } from "crypto";

const COOKIE_NAME = "yaminabe_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: { select: { id: true, email: true, name: true, plan: true } },
    },
  });

  if (!session || session.expires < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  return user;
}

export async function createSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + MAX_AGE * 1000);

  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }

  store.delete(COOKIE_NAME);
}
