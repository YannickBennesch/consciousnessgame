import { notFound } from "next/navigation";
import { getLegal } from "@/lib/content";
import { Html } from "@/components/ui";

export function generateStaticParams() {
  return getLegal().map((d) => ({ slug: d.slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getLegal().find((d) => d.slug === slug);
  if (!page) notFound();
  return (
    <div className="wrap">
      <h1>{page.title}</h1>
      <Html html={page.html} />
    </div>
  );
}
