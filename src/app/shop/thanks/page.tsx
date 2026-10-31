import Link from "next/link";

export const metadata = { title: "Thank you" };

export default function ThanksPage() {
  return (
    <div className="wrap">
      <h1>Thank you</h1>
      <p>Your order is in. You will receive a confirmation by e-mail, and another one when it ships.</p>
      <p>
        When your piece arrives, scan the QR code on the patch or enter the player code on <Link href="/play">the code page</Link>{" "}
        to begin.
      </p>
    </div>
  );
}
