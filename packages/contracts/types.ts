export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  label: string;
  sort: number;
}
export interface Article {
  id: string;
  slug: string;
  categoryId: string;
  title: string;
  summary: string;
  badge: string;
  type: 'EXTERNAL' | 'INTERNAL';
  url: string;
  cover: string;
  body: any;
  publishedAt?: string;
}
export interface Site {
  headerButton: { label: string; url: string; newTab: boolean; visible: boolean };
  navigation: { id: string; label: string; href: string; newTab: boolean; visible: boolean }[];
  modules: {
    hero: boolean;
    about: boolean;
    tags: boolean;
    articles: boolean;
    courses: boolean;
    contact: boolean;
  };
  labels: Record<
    | 'aboutEyebrow'
    | 'poolEyebrow'
    | 'articlesEyebrow'
    | 'articlesTitle'
    | 'articlesHighlight'
    | 'coursesEyebrow'
    | 'contactEyebrow'
    | 'contactWordmark'
    | 'courseButtonLabel'
    | 'announcementUrl',
    string
  >;
  collections: { categoryId: string; articleIds: string[] }[];
  wechatIcon: string;
  brand: string;
  name: string;
  role: string;
  heroEyebrow: string;
  heroSubtitle: string;
  heroImage: string;
  avatar: string;
  aboutTitle: string;
  aboutHighlight: string;
  aboutDescription: string;
  exploreTitle: string;
  exploreHighlight: string;
  tags: string[];
  announcement: string;
  announcementVisible: boolean;
  courseTitle: string;
  courseHighlight: string;
  courseAudience: string;
  courseImage: string;
  courseIntro: string[];
  courseMethod: string;
  courseStats: string;
  courseUrl: string;
  contactTitle: string;
  cardFront: string;
  cardBack: string;
  strap: string;
  socials: { name: string; url: string; icon: string }[];
  seoTitle: string;
  seoDescription: string;
  shareImage: string;
  footer: string;
  splashEnabled: boolean;
}
export interface SiteData {
  site: Site;
  categories: Category[];
  articles: Article[];
  previewArticle?: Article;
}
