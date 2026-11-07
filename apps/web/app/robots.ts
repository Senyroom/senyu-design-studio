import { siteUrl } from '../lib/site-url';
export const dynamic = 'force-dynamic';
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/preview', '/api/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
