import Link from "next/link";
import { redirect } from "next/navigation";
import { requestSignIn } from "@/lib/activation";
import { clientIp, str } from "@/lib/request";
import { Notice } from "@/components/ui";

export const metadata = { title: "Sign in" };

async function signIn(form: FormData) {
  "use server";
  const res = await requestSignIn({ email: str(form, "email"), ip: await clientIp() });
  redirect(res.ok ? "/signin?sent=1" : "/signin?error=1");
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="wrap">
      <h1>Sign in</h1>
      {sp.sent ? (
        <Notice role="status">
          <p>If this address belongs to a player, a sign-in link is on its way.</p>
        </Notice>
      ) : null}
      {sp.error ? (
        <Notice role="alert">
          <p>Please enter a valid e-mail address.</p>
        </Notice>
      ) : null}
      {sp.expired ? (
        <Notice role="alert">
          <p>This link has expired or was already used. Ask for a new one below.</p>
        </Notice>
      ) : null}
      <form action={signIn}>
        <label htmlFor="email">E-mail address</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <div className="actions">
          <button type="submit">Send me a sign-in link</button>
        </div>
      </form>
      <p className="small ui muted">
        New here with a player code? <Link href="/play">Enter the game</Link>
      </p>
    </div>
  );
}
