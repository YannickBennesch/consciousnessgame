import Link from "next/link";
import { notFound } from "next/navigation";
import { getTutorial } from "@/lib/content";
import { Html } from "@/components/ui";

export default async function TutorialUnit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const units = getTutorial();
  const i = units.findIndex((u) => u.slug === slug);
  if (i < 0) notFound();
  const unit = units[i];
  return (
    <>
      <p className="ui small">
        <Link href="/profile/tutorial">Tutorial</Link>
      </p>
      <h1>{unit.title}</h1>
      {unit.audio ? (
        <figure>
          <figcaption className="ui small">Podcast</figcaption>
          <audio controls src={unit.audio} preload="none" />
          {unit.transcript ? <a href={unit.transcript}>Transcript</a> : null}
        </figure>
      ) : null}
      {unit.video ? (
        <video controls preload="none" src={unit.video} style={{ width: "100%" }}>
          <track kind="captions" src={unit.video.replace(/\.\w+$/, ".vtt")} srcLang="en" label="English" default />
        </video>
      ) : null}
      <Html html={unit.html} />
      <nav className="actions ui" aria-label="Tutorial pages">
        {i > 0 ? <Link href={`/profile/tutorial/${units[i - 1].slug}`}>← {units[i - 1].title}</Link> : null}
        {i < units.length - 1 ? <Link href={`/profile/tutorial/${units[i + 1].slug}`}>{units[i + 1].title} →</Link> : null}
      </nav>
    </>
  );
}
