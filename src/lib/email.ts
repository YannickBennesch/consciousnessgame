import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(mail: Mail): Promise<void>;
}

/** Development: writes each mail to .mail-outbox/ and logs the subject. */
class ConsoleProvider implements EmailProvider {
  async send(mail: Mail) {
    const dir = path.join(process.cwd(), ".mail-outbox");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.txt`);
    await writeFile(file, `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    console.log(`[mail] ${mail.subject} -> ${mail.to} (${file})`);
  }
}

/** Any provider with SMTP (Postmark, Brevo, ...). Chosen by the authors; see DECISIONS.md. */
class SmtpProvider implements EmailProvider {
  async send(mail: Mail) {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: process.env.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
  }
}

let override: EmailProvider | null = null;

/** Tests swap the provider to capture mails. */
export function setEmailProvider(p: EmailProvider | null) {
  override = p;
}

export function emailProvider(): EmailProvider {
  if (override) return override;
  return process.env.EMAIL_PROVIDER === "smtp" ? new SmtpProvider() : new ConsoleProvider();
}

export function sendMail(mail: Mail) {
  return emailProvider().send(mail);
}
