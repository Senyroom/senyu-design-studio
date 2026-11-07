import { z } from 'zod';
const text = (n = 200) => z.string().trim().max(n);
const href = z
  .string()
  .max(2000)
  .refine(
    (v) => !v || /^https?:\/\//i.test(v) || /^\/media\/[a-zA-Z0-9_.-]+$/.test(v),
    '请使用 http(s) 链接或本站媒体地址',
  );
const image = z
  .string()
  .max(2000)
  .refine((v) => !v || /^\/media\/[a-zA-Z0-9_.-]+$/.test(v), '请选择媒体库文件');
export const navigationHref = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    if (!v || /[\\\s\u0000-\u001f\u007f]/.test(v) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(v))
      return false;
    if (/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(v)) return true;
    if (v.startsWith('/') && !v.startsWith('//') && !/^\/%2f/i.test(v)) return true;
    try {
      const u = new URL(v);
      return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password;
    } catch {
      return false;
    }
  }, '请输入 http(s) 链接、本站路径或 #模块锚点');
const unique = (values: string[]) => new Set(values).size === values.length;
const navItem = z
  .object({
    id: text(80).min(1),
    label: text(40).min(1),
    href: navigationHref,
    newTab: z.boolean(),
    visible: z.boolean(),
  })
  .strict();
const validBody = (v: any, depth = 0): boolean => {
  if (!v) return depth === 0;
  if (depth > 30 || typeof v !== 'object' || Array.isArray(v)) return false;
  if (
    ![
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'hardBreak',
      'horizontalRule',
      'image',
    ].includes(v.type)
  )
    return false;
  if (v.type === 'text' && typeof v.text !== 'string') return false;
  if (v.type === 'image' && !/^\/media\/[a-zA-Z0-9_.-]+$/.test(v.attrs?.src || '')) return false;
  if (
    v.marks &&
    (!Array.isArray(v.marks) ||
      !v.marks.every(
        (m: any) =>
          m &&
          ['bold', 'italic', 'strike', 'underline', 'code', 'link'].includes(m.type) &&
          (m.type !== 'link' || /^https?:\/\//i.test(m.attrs?.href || '')),
      ))
  )
    return false;
  return (
    !v.content || (Array.isArray(v.content) && v.content.every((n: any) => validBody(n, depth + 1)))
  );
};
const richBody = z
  .any()
  .refine(
    (v) => !v || (JSON.stringify(v).length <= 150000 && v.type === 'doc' && validBody(v)),
    '正文格式无效，图片请从本地媒体库选择',
  )
  .default(null);
export const articleSchema = z
  .object({
    title: text(180).min(1),
    summary: text(1000).default(''),
    badge: text(60).default('ARTICLE'),
    type: z.enum(['EXTERNAL', 'INTERNAL']),
    url: href.default(''),
    cover: image.default(''),
    body: richBody,
  })
  .strict()
  .superRefine((v, c) => {
    if (v.type === 'EXTERNAL' && !/^https?:\/\//i.test(v.url))
      c.addIssue({ code: 'custom', message: '外链文章需要有效网址', path: ['url'] });
  });
export const articleInput = z.object({
  slug: text(180).regex(/^[a-z0-9][a-z0-9-]*$/),
  categoryId: text(80).min(1),
  sort: z.number().int().min(0).max(100000).default(0),
  revision: z.number().int().optional(),
  content: articleSchema,
});
export const categorySchema = z.object({
  name: text(120).min(1),
  slug: text(120).regex(/^[a-z0-9-]+$/),
  description: text(500),
  label: text(120),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  sort: z.number().int().min(0).default(0),
});
export const siteSchema = z
  .object({
    headerButton: z
      .object({
        label: text(40).min(1),
        url: navigationHref,
        newTab: z.boolean(),
        visible: z.boolean(),
      })
      .strict()
      .default({ label: '进入设计所', url: '#articles', newTab: false, visible: true }),
    navigation: z
      .array(navItem)
      .max(8)
      .refine((v) => unique(v.map((n) => n.id)), '导航 ID 不能重复')
      .default([
        { id: 'about', label: '我是谁', href: '#about', newTab: false, visible: true },
        { id: 'articles', label: '我在想', href: '#articles', newTab: false, visible: true },
        { id: 'courses', label: '我在做', href: '#courses', newTab: false, visible: true },
        { id: 'contact', label: '找到我', href: '#contact', newTab: false, visible: true },
      ]),
    modules: z
      .object({
        hero: z.boolean().default(true),
        about: z.boolean().default(true),
        tags: z.boolean().default(true),
        articles: z.boolean().default(true),
        courses: z.boolean().default(true),
        contact: z.boolean().default(true),
      })
      .strict()
      .default({
        hero: true,
        about: true,
        tags: true,
        articles: true,
        courses: true,
        contact: true,
      }),
    labels: z
      .object({
        aboutEyebrow: text(120).default('01 / ABOUT ME'),
        poolEyebrow: text(120).default('DESIGNER · BUILDER · EXPLORER'),
        articlesEyebrow: text(120).default('02 / LEARN IN PUBLIC'),
        articlesTitle: text(200).default('边探索，'),
        articlesHighlight: text(120).default('边记录'),
        coursesEyebrow: text(120).default('03 / THE PLAYBOOK'),
        contactEyebrow: text(120).default('04 / LET’S CONNECT'),
        contactWordmark: text(120).default('Contact me'),
        courseButtonLabel: text(40).default('查看课程'),
        announcementUrl: navigationHref.default('#courses'),
      })
      .strict()
      .prefault({}),
    collections: z
      .array(
        z
          .object({
            categoryId: text(80).min(1),
            articleIds: z.array(text(80).min(1)).max(3).refine(unique, '展示文章不能重复'),
          })
          .strict(),
      )
      .max(30)
      .refine((v) => unique(v.map((c) => c.categoryId)), '文件夹分类不能重复')
      .default([]),
    wechatIcon: image.default(''),
    brand: text(80).min(1),
    name: text(80).min(1),
    role: text(120),
    heroEyebrow: text(120),
    heroSubtitle: text(200),
    heroImage: image,
    avatar: image,
    aboutTitle: text(200),
    aboutHighlight: text(80),
    aboutDescription: text(1000),
    exploreTitle: text(200),
    exploreHighlight: text(200),
    tags: z.array(text(50).min(1, '身份标签不能为空')).max(30).refine(unique, '身份标签不能重复'),
    announcement: text(300),
    announcementVisible: z.boolean(),
    courseTitle: text(200),
    courseHighlight: text(100),
    courseAudience: text(500),
    courseImage: image,
    courseIntro: z.array(text(300)).max(20),
    courseMethod: text(500),
    courseStats: text(200),
    courseUrl: href,
    contactTitle: text(200),
    cardFront: image,
    cardBack: image,
    strap: image,
    socials: z.array(z.object({ name: text(50), url: href, icon: image })).max(10),
    seoTitle: text(200),
    seoDescription: text(500),
    shareImage: image,
    footer: text(200),
    splashEnabled: z.boolean(),
  })
  .strict();
