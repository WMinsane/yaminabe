"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@yaminabe/db";
import { sendPasswordResetEmail } from "@/lib/mail";

const TOKEN_EXPIRY_MINUTES = 10;

export async function requestResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/password?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    await sendPasswordResetEmail(email, token);
  }

  redirect("/password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) {
    redirect("/password/reset?error=invalid_token");
  }

  if (!password || password.length < 8) {
    redirect(`/password/reset?token=${token}&error=password_short`);
  }

  if (password !== passwordConfirm) {
    redirect(`/password/reset?token=${token}&error=password_mismatch`);
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    redirect("/password/reset?error=expired");
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  });

  if (!user) {
    redirect("/password/reset?error=invalid_token");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token } },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  redirect("/auth?reset=success");
}
