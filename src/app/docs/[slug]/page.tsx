import Link from "next/link";
import { notFound } from "next/navigation";
import { FORM_LABELS, FORM_RULES, FORMS, getDocs, getLegal, getLevels } from "@/lib/content";
import { Html, levelLabel, Swatch } from "@/components/ui";
import { SupportNotice } from "@/components/support";

export function generateStaticParams() {
  return getDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocs().find((d) => d.slug === slug);
  return { title: doc?.title };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocs().find((d) => d.slug === slug);
  if (!doc) notFound();
  const disclaimer = getLegal().find((l) => l.slug === "disclaimer");
  return (
    <div className="wrap">
      <p className="ui small">
        <Link href="/docs">About the game</Link>
      </p>
      <h1>{doc.title}</h1>
      {doc.supportNotice ? <SupportNotice /> : null}
      <Html html={doc.html} />
      {doc.showFormRules ? (
        <>
          <h2>Forms at a glance</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">Rule</th>
                </tr>
              </thead>
              <tbody>
                {FORMS.map((f) => (
                  <tr key={f}>
                    <th scope="row">{FORM_LABELS[f]}</th>
                    <td>{FORM_RULES[f]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {doc.showSpiral ? (
        <ul className="spiral">
          {getLevels().map((l) => (
            <li key={l.number}>
              <Swatch level={l} />
              {levelLabel(l)}
              {l.status === "in-preparation" ? <span className="muted"> · in preparation</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {disclaimer ? (
        <div className="notice small">
          <Html html={disclaimer.html} className="" />
        </div>
      ) : null}
    </div>
  );
}
