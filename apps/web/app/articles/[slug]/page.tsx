import { notFound } from 'next/navigation';
import { api } from '../../../lib/data';
import ArticleBody from '../../../components/ArticleBody';
export const dynamic = 'force-dynamic';
async function article(slug: string) {
  const r = await fetch(`${api}/api/v1/public/articles/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (!r.ok) notFound();
  return r.json();
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await article((await params).slug);
  return { title: a.title, description: a.summary };
}
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await article((await params).slug);
  return (
    <main className="article-page">
      <a href="/#articles">← 返回探索记录</a>
      <p className="eyebrow">LEARN IN PUBLIC</p>
      <h1>{a.title}</h1>
      <p className="article-summary">{a.summary}</p>
      {a.cover && <img className="article-cover" src={a.cover} alt={a.title} />}
      <ArticleBody body={a.body} />
      {a.type === 'EXTERNAL' && (
        <a className="primary-button" href={a.url} target="_blank" rel="noopener noreferrer">
          阅读原文 ↗
        </a>
      )}
    </main>
  );
}
