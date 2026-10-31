import Link from "next/link";
import { redirect } from "next/navigation";
import { requestActivation } from "@/lib/activation";
import { clientIp, str } from "@/lib/request";
import { Notice } from "@/components/ui";

export const metadata = { title: "Enter the game" };

async function activate(form: FormData) {
  "use server";
  const code = str(form, "code");
  const res = await requestActivation({ code, email: str(form, "email"), ip: await clientIp() });
  if (res.ok) redirect("/play?sent=1");
  redirect(`/play?code=${encodeURIComponent(code)}&error=${res.reason}`);
}

const MESSAGES: Record<string, string> = {
  "invalid-input": "Please enter a valid e-mail address.",
  "unknown-code": "We could not find this code. Please check it against your patch.",
  "in-play": "This code is already in play.",
  "rate-limited": "Too many attempts. Please wait an hour and try again.",
};

export default async function PlayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (sp.sent) {
    return (
      <div className="wrap">
        <h1>Check your e-mail</h1>
        <p>We have sent you a link to your player profile. It works once and for 30 minutes.</p>
        <p className="muted small ui">No e-mail? Check your spam folder, or <Link href="/play">try again</Link>.</p>
      </div>
    );
  }
  return (
    <div className="wrap">
      <h1>Enter the game</h1>
      <p>Enter the player code from your patch and your e-mail address. We will send you a link to your player profile.</p>
      {sp.error ? (
        <Notice role="alert">
          <p>{MESSAGES[sp.error] ?? "Something went wrong. Please try again."}</p>
          {sp.error === "in-play" ? (
            <p>
              If you think this is a mistake, <Link href="/support">contact us</Link>.
            </p>
          ) : null}
        </Notice>
      ) : null}
      <form action={activate}>
        <label htmlFor="code">
          Player code
          <span className="hint">Ten letters and numbers, as printed on the patch, e.g. K7QX-M4RT-2W</span>
        </label>
        <input
          id="code"
          name="code"
          type="text"
          className="code-input"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={sp.code ?? ""}
        />
        <label htmlFor="email">E-mail address</label>
        <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" />
        <p className="hint">We only need your e-mail address and your code to start. Everything else is optional.</p>
        <div className="actions">
          <button type="submit">Send me the link</button>
        </div>
      </form>
      <p className="small ui muted">
        Already playing? <Link href="/signin">Sign in</Link>
      </p>
    </div>
  );
}
