import type { Site } from './types';

export const defaultSiteConfig = {
  headerButton: { label: '进入设计所', url: '#articles', newTab: false, visible: true },
  navigation: [
    { id: 'about', label: '我是谁', href: '#about', newTab: false, visible: true },
    { id: 'articles', label: '我在想', href: '#articles', newTab: false, visible: true },
    { id: 'courses', label: '我在做', href: '#courses', newTab: false, visible: true },
    { id: 'contact', label: '找到我', href: '#contact', newTab: false, visible: true },
  ],
  modules: { hero: true, about: true, tags: true, articles: true, courses: true, contact: true },
  labels: {
    aboutEyebrow: '01 / ABOUT ME',
    poolEyebrow: 'DESIGNER · BUILDER · EXPLORER',
    articlesEyebrow: '02 / LEARN IN PUBLIC',
    articlesTitle: '边探索，',
    articlesHighlight: '边记录',
    coursesEyebrow: '03 / THE PLAYBOOK',
    contactEyebrow: '04 / LET’S CONNECT',
    contactWordmark: 'Contact me',
    courseButtonLabel: '查看课程',
    announcementUrl: '#courses',
  },
  collections: [] as Site['collections'],
  wechatIcon: '',
};

// Old database snapshots and restored versions retain the original behavior.
export function normalizeSite(site: Site): Site {
  return {
    ...defaultSiteConfig,
    ...site,
    headerButton: { ...defaultSiteConfig.headerButton, ...site.headerButton },
    modules: { ...defaultSiteConfig.modules, ...site.modules },
    labels: { ...defaultSiteConfig.labels, ...site.labels },
  };
}
