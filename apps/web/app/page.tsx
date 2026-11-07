import { getSite } from '../lib/data';
import Home from '../components/Home';
export async function generateMetadata() {
  const { site } = await getSite();
  return {
    title: site.seoTitle,
    description: site.seoDescription,
    openGraph: {
      title: site.seoTitle,
      description: site.seoDescription,
      images: [site.shareImage],
    },
  };
}
export default async function Page() {
  return <Home data={await getSite()} />;
}
