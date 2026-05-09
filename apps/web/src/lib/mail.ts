export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const resetUrl = `${baseUrl}/password/reset?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "闇鍋 <noreply@yaminabe.app>",
      to: email,
      subject: "パスワードリセット — 闇鍋",
      html: `
        <p>${email} 様</p>
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p><a href="${resetUrl}">こちらをクリックしてパスワードを変更</a></p>
        <p>このリンクは10分間有効です。</p>
        <p>心当たりのない場合はこのメールを無視してください。</p>
      `,
    });
  } else {
    console.log(`[DEV] パスワードリセットリンク: ${resetUrl}`);
  }
}
