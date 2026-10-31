import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDocs } from "@/lib/content";
import { createSupportRequest } from "@/lib/support";
import { resolveItem } from "@/lib/game";
import { clientIp, str } from "@/lib/request";
import { Html, Notice } from "@/components/ui";
import { SupportNotice } from "@/components/support";

export const metadata = { title: "Support" };

async function send(form: FormData) {
  "use server";
  const user = await currentUser();
  const includeItem = str(form, "includeItem") === "on";
  try {
    await createSupportRequest(
      user?.id ?? null,
      {
        message: str(form, "message"),
        itemRef: includeItem ? str(form, "item") || null : null,
        replyTo: user ? null : str(form, "replyTo") || null,
      },
      await clientIp(),
    );
  } catch {
    redirect("/support?error=1");
  }
  redirect("/support?sent=1");
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const doc = getDocs().find((d) => d.slug === "support");
  const item = sp.item ? await resolveItem(sp.item) : null;
  return (
    <div className="wrap">
      <h1>Support</h1>
      <SupportNotice />
      {sp.sent ? (
        <Notice role="status">
          <p>Your message has been sent to the support contacts. They will reply by e-mail.</p>
        </Notice>
      ) : null}
      {sp.error ? (
        <Notice role="alert">
          <p>The message could not be sent. Please check it and try again in a little while.</p>
        </Notice>
      ) : null}

      <h2 id="form">This touches something I can't carry alone</h2>
      <form action={send}>
        <label htmlFor="message">What would you like to share?</label>
        <textarea id="message" name="message" required maxLength={5000} />
        {item ? (
          <label className="choice">
            <input type="checkbox" name="includeItem" defaultChecked />
            <span>
              Include a link to “{item.title}”
              <span className="hint">The support contacts will see which challenge or quest this is about.</span>
            </span>
          </label>
        ) : null}
        <input type="hidden" name="item" value={item?.ref ?? ""} />
        {!user ? (
          <>
            <label htmlFor="replyTo">Your e-mail address, so we can reply</label>
            <input id="replyTo" name="replyTo" type="email" required autoComplete="email" />
          </>
        ) : null}
        <div className="actions">
          <button type="submit">Send to the support contacts</button>
        </div>
      </form>

      {doc ? <Html html={doc.html} /> : null}
    </div>
  );
}
