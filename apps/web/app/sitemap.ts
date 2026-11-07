import { getSite } from '../lib/data';
import { siteUrl } from '../lib/site-url';
export default async function sitemap() {
  const root = siteUrl();
  const { articles } = await getSite();
  return [
    { url: root },
    ...articles
      .filter((a) => a.type === 'INTERNAL')
      .map((a) => ({ url: `${root}/articles/${a.slug}` })),
  ];
}
export const dynamic = 'force-dynamic';
