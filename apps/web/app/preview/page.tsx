import { api } from '../../lib/data';
import Home from '../../components/Home';
import ArticleBody from '../../components/ArticleBody';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: '草稿预览',
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token)
    return (
      <main className="error-page">
        <h1>预览链接无效</h1>
        <p>请从管理后台重新打开预览。</p>
      </main>
    );
  const r = await fetch(`${api}/api/v1/preview?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!r.ok)
    return (
      <main className="error-page">
        <h1>预览已过期或不可用</h1>
        <p>请回到后台生成新链接。</p>
      </main>
    );
  const data = await r.json();
  const transform = (v: any): any => {
    if (typeof v === 'string' && v.startsWith('/media/'))
      return `/api/v1/media/private/${v.slice(7)}?token=${encodeURIComponent(token)}`;
    if (Array.isArray(v)) return v.map(transform);
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, transform(x)]));
    return v;
  };
  const preview = transform(data);
  return (
    <>
      <div className="preview-banner">草稿预览 · 此内容尚未公开</div>
      {preview.previewArticle ? (
        <main className="article-page">
          <a href="/">← 返回首页</a>
          <h1>{preview.previewArticle.title}</h1>
          <p>{preview.previewArticle.summary}</p>
          <ArticleBody body={preview.previewArticle.body} />
        </main>
      ) : (
        <Home data={preview} />
      )}
    </>
  );
}
