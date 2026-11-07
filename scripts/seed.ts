import { config } from 'dotenv';
config({ quiet: true });
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { defaultSiteConfig } from '../packages/contracts/site-config';
const db = new PrismaClient();
async function seed() {
  if (!process.env.ADMIN_PASSWORD) throw new Error('设置 ADMIN_PASSWORD 后重试');
  await db.user.upsert({
    where: { username: process.env.ADMIN_USERNAME || 'admin' },
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD),
    },
    update: {},
  });
  const dir = path.resolve(process.env.MEDIA_ROOT!);
  const files = await fs.readdir('seed-assets');
  const media: Record<string, string> = {};
  for (const filename of files) {
    const buffer = await fs.readFile(path.join('seed-assets', filename));
    const key = `seed-${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 20)}${path.extname(filename)}`;
    media[filename] = `/media/${key}`;
    await fs.mkdir(path.join(dir, 'private/originals'), { recursive: true });
    await fs.mkdir(path.join(dir, 'public'), { recursive: true });
    await fs.copyFile(path.join('seed-assets', filename), path.join(dir, 'private/originals', key));
    const meta = await sharp(buffer)
      .metadata()
      .catch(() => ({ width: undefined, height: undefined }));
    await db.media.upsert({
      where: { key },
      create: {
        key,
        filename,
        mime: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        size: buffer.length,
        width: meta.width,
        height: meta.height,
        alt: filename,
      },
      update: {},
    });
  }
  const cats = [
    {
      name: 'AI入门知识',
      slug: 'foundations',
      description: '从核心概念开始，建立你的 AI 认知。',
      label: '01 / FOUNDATIONS',
      color: '#2436ff',
      sort: 0,
    },
    {
      name: 'AI工具指南',
      slug: 'toolkit',
      description: '从安装到上手，把工具用进日常。',
      label: '02 / TOOLKIT',
      color: '#8b4bc7',
      sort: 1,
    },
    {
      name: 'AI设计实战',
      slug: 'practice',
      description: '从想法到交付，跑通设计每一步。',
      label: '03 / DESIGN PRACTICE',
      color: '#d477b0',
      sort: 2,
    },
  ];
  const categoryIds: Record<string, string> = {};
  for (const c of cats) {
    const v = await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
    categoryIds[c.name] = v.id;
  }
  const articles = JSON.parse(await fs.readFile('docs/reference/articles.json', 'utf8'));
  const badges = [
    'MCP',
    'SKILL',
    'PROMPT',
    'BASICS',
    'FIGMA MCP',
    'SKILL',
    'AGENT',
    'TOOLS',
    'DESIGN.MD',
    'CODEX × OBSIDIAN',
    'CODEX',
    'FIGMA',
    'PRODUCT DESIGN',
    'EDIT × EXPORT',
    'COWART',
    'WORKFLOW',
    'DESIGN.MD',
    'GPT WORK',
    'CODEX × FEISHU',
    'FEISHU CLI',
    'CODEX',
    'PENCIL',
    'IMAGE2 × FIGMA',
  ];
  const summaries = [
    '这一篇关于“MCP是什么”的文章，我建议设计师先从学习“MCP如何使用”开始，再建立系统理解。',
    'skill 是用自然语言撰写，所以对零代码基础的人来说不算难。',
    '从业务背景、场景与目标出发，整理更清晰的提示词。',
  ];
  for (const a of articles) {
    const content = {
      title: a.title,
      summary: a.summary || summaries[a.sort % 3],
      badge: badges[a.sort] || 'DESIGN PRACTICE',
      type: a.url ? 'EXTERNAL' : 'INTERNAL',
      url: a.url,
      cover: '',
      body: a.body || null,
    };
    await db.article.upsert({
      where: { slug: `exploration-${a.sort + 1}` },
      create: {
        slug: `exploration-${a.sort + 1}`,
        categoryId: categoryIds[a.category],
        sort: a.sort,
        draft: content,
        published: { ...content, categoryId: categoryIds[a.category], sort: a.sort },
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      update: {},
    });
  }
  const site = {
    ...defaultSiteConfig,
    wechatIcon: media['official-wechat.svg'],
    brand: '森语设计所',
    name: '示例创作者',
    role: 'Vibe Designer',
    heroEyebrow: 'DESIGN × AI / VOL. 01',
    heroSubtitle: '探索设计师在 AI 时代 的成长之路',
    heroImage: media['male-scientist.png'],
    avatar: media['male-avatar.png'],
    aboutTitle: '从画画到设计，',
    aboutHighlight: '再到 AI',
    aboutDescription:
      '这里是你的个人介绍，可以记录学习、设计和创作经历。\n开源默认内容仅为演示，请在后台替换成自己的资料。',
    exploreTitle: '这是我正在探索的',
    exploreHighlight: '——VibeDesign 之路',
    tags: ['独立设计师', '体验设计师', '产品探索者', '视觉创作者', 'Vibe Coder', '开源爱好者', '终身学习者', 'AI 探索者', '设计与技术'],
    announcement: '森语设计所开源啦　 ✦　 记录灵感与创造',
    announcementVisible: true,
    courseTitle: 'AI 设计工作流',
    courseHighlight: '必修课',
    courseAudience: '面向想转型AI设计师、设计学生、初入职场设计师\n及Vibe Coder',
    courseImage: media['typewriter.png'],
    courseIntro: [
      '基础课｜建立 AI 设计工作流认知',
      '进阶课｜用 AI 做一个完整项目',
      '拓展课｜完善产品设计并正式上线',
      '最终，获得一个真实可访问的网站链接。',
    ],
    courseMethod: '示例课程与服务\n在后台填写你真实提供的内容',
    courseStats: '原创示例｜可编辑内容｜本地媒体',
    courseUrl: '',
    contactTitle: '让灵感，从一次聊天开始。',
    cardFront: media['male-creative-pass-front.svg'],
    cardBack: media['creative-pass-back.svg'],
    strap: media['creative-strap.svg'],
    socials: [
      {
        name: '小红书',
        url: 'https://www.xiaohongshu.com/',
        icon: media['official-xiaohongshu.svg'],
      },
      {
        name: '抖音',
        url: 'https://www.douyin.com/',
        icon: media['official-douyin.svg'],
      },
    ],
    seoTitle: '森语设计所 · 设计与创造',
    seoDescription: '探索设计师在 AI 时代的成长之路，边探索，边记录。',
    shareImage: media['male-scientist.png'],
    footer: 'DESIGNER · BUILDER · EXPLORER',
    splashEnabled: true,
  };
  await db.setting.upsert({
    where: { key: 'site' },
    create: { key: 'site', draft: site, published: site },
    update: {},
  });
  const existing = await db.setting.findUniqueOrThrow({ where: { key: 'site' } });
  const keys = new Set<string>();
  const visit = (v: any) => {
    if (typeof v === 'string' && v.startsWith('/media/')) keys.add(v.slice(7));
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(existing.published);
  for (const key of keys)
    await fs.copyFile(path.join(dir, 'private/originals', key), path.join(dir, 'public', key));
  console.log(
    `初始化完成：${articles.length} 篇文章、3 个分类、${files.length} 个本地媒体。重复运行不会覆盖已编辑内容。`,
  );
}
seed().finally(() => db.$disconnect());
