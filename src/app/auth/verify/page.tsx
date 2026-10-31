import Link from "next/link";
import { redirect } from "next/navigation";
import { consumeMagicLink } from "@/lib/activation";
import { createSession, setSessionCookie } from "@/lib/auth";
import { str } from "@/lib/request";

export const metadata = { title: "Open your profile" };

// The link opens this page; the token is consumed only on the button press (POST),
// so e-mail scanners that prefetch links cannot use it up.
async function confirm(form: FormData) {
  "use server";
  const res = await consumeMagicLink(str(form, "token"));
  if (!res.ok) redirect(res.reason === "in-play" ? "/play?error=in-play" : "/signin?expired=1");
  const { token, expiresAt } = await createSession(res.userId);
  await setSessionCookie(token, expiresAt);
  redirect(res.isNew ? "/profile/tutorial" : "/profile");
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="wrap">
        <h1>This link is incomplete</h1>
        <p>
          Please open the link from your e-mail again, or <Link href="/signin">ask for a new one</Link>.
        </p>
      </div>
    );
  }
  return (
    <div className="wrap">
      <h1>Welcome</h1>
      <form action={confirm}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" autoFocus>
          Open my player profile
        </button>
      </form>
    </div>
  );
}
