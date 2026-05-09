"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@yaminabe/db";
import { createSession, destroySession } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/auth?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/auth?error=invalid");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) redirect("/auth?error=invalid");

  await createSession(user.id);
  redirect("/");
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    redirect("/auth?tab=signup&error=missing");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/auth?tab=signup&error=email_invalid");
  }

  if (password.length < 8) {
    redirect("/auth?tab=signup&error=password_short");
  }

  if (password !== passwordConfirm) {
    redirect("/auth?tab=signup&error=password_mismatch");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/auth?tab=signup&error=email_taken");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      plan: "free",
    },
  });

  await prisma.userSetting.create({
    data: { userId: user.id, updatedBy: user.id },
  });

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/auth");
}
