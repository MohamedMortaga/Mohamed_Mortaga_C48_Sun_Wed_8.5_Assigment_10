import nodemailer from "nodemailer";
import { EMAIL_PASS, EMAIL_USER } from "../../config/config.js";

let transporter;

// Gmail when EMAIL_USER / EMAIL_PASS are set in .env,
// otherwise a free Ethereal test inbox (emails are not really delivered,
// the server prints a link to open them in the browser).
async function getTransporter() {
  if (transporter) return transporter;

  if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  return transporter;
}

export async function sendEmail({ to, subject, html } = {}) {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: `"Saraha App" <${EMAIL_USER || "no-reply@saraha.app"}>`,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Email preview (Ethereal):", previewUrl);
  }

  return info;
}
