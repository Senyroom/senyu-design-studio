import { config } from 'dotenv';
config({ quiet: true });
import test from 'node:test';
import { siteSchema, navigationHref } from '../apps/api/src/validation';
import { defaultSiteConfig, normalizeSite } from '../packages/contracts/site-config';
import type { Site } from '../packages/contracts/types';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as argon2 from 'argon2';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:4000';
const origin = process.env.ADMIN_ORIGIN!;
let cookie = '',
  csrf = '';
async function call(
  route: string,
  method = 'GET',
  body?: unknown,
  overrides: Record<string, string> = {},
) {
  const headers: Record<string, string> = { origin, cookie, 'x-csrf-token': csrf, ...overrides };
  if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const r = await fetch(`${base}/api/v1/${route}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  return { r, data };
}
async function ok(route: string, method = 'GET', body?: unknown) {
  const { r, data } = await call(route, method, body);
  assert.ok(r.ok, `${route}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
async function publicStatus(key: string) {
  return (await fetch(`${base}/media/${key}`)).status;
}
async function until(check: () => Promise<boolean>, label: string) {
  for (let i = 0; i < 40; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.fail(`等待超时：${label}`);
}

test('导航地址边界与历史站点快照兼容', () => {
  for (const url of [
    'javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    'https://a.example/\\evil',
    '/%2fevil.example',
    'https://a.example/%0aevil',
    'data:text/html,hi',
  ])
    assert.equal(navigationHref.safeParse(url).success, false, url);
  for (const url of [
    '#articles',
    '/articles/example',
    'https://example.com/path?x=1',
    'http://localhost:3000/',
  ])
    assert.equal(navigationHref.safeParse(url).success, true, url);
  const old = Object.fromEntries(
    Object.entries(siteSchema.shape)
      .filter(([k]) => !(k in defaultSiteConfig))
      .map(([k, v]) => [
        k,
        k === 'socials' || k === 'tags' || k === 'courseIntro'
          ? []
          : k === 'announcementVisible' || k === 'splashEnabled'
            ? true
            : k === 'brand' || k === 'name'
              ? '测试'
              : '',
      ]),
  );
  const parsed = siteSchema.parse(old);
  const normalized = normalizeSite(old as unknown as Site);
  for (const key of Object.keys(defaultSiteConfig) as (keyof typeof defaultSiteConfig)[])
    assert.deepEqual(parsed[key], normalized[key], key);
  assert.equal(
    siteSchema.safeParse({ ...parsed, collections: [{ categoryId: 'a', articleIds: ['1', '1'] }] })
      .success,
    false,
  );
});

test('MySQL 8、认证、草稿、预览、媒体、发布与版本恢复', async (t) => {
  const db = new PrismaClient();
  const prefix = `qa-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const categories: string[] = [],
    articles: string[] = [],
    media: any[] = [];
  let article: any;
  const body = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '集成测试正文' }] }],
  };
  try {
    await t.test('真实 MySQL 8 与访问边界', async () => {
      const health = await ok('health');
      assert.match(health.version, /^8\./);
      assert.equal((await call('admin/articles')).r.status, 401);
      assert.equal(
        (
          await call(
            'auth/login',
            'POST',
            { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD },
            { origin: 'https://invalid.example' },
          )
        ).r.status,
        403,
      );
      const login = await call('auth/login', 'POST', {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      assert.equal(login.r.status, 201);
      cookie = login.r.headers.get('set-cookie')!.split(';')[0];
      csrf = login.data.csrf;
      assert.match(login.r.headers.get('set-cookie')!, /HttpOnly/i);
      assert.equal(
        (await call('admin/preview', 'POST', { kind: 'site' }, { 'x-csrf-token': '' })).r.status,
        403,
      );
      for (let i = 0; i < 2; i++) {
        const c = await ok('admin/categories', 'POST', {
          name: `QA分类${i}`,
          slug: `${prefix}-${i}`,
          description: '测试完成自动移除',
          color: '#7251aa',
          label: 'QA',
          sort: 999,
        });
        categories.push(c.id);
      }
    });
    await t.test('真实 Redis 缓存命中与分类更新立即生效', async () => {
      assert.equal((await ok('health')).cache.connected, true);
      await ok('public/site');
      const before = (await ok('health')).cache.hits;
      await ok('public/site');
      assert.ok((await ok('health')).cache.hits > before);
      const category = (await ok('admin/categories')).find((c: any) => c.id === categories[0]);
      const { id, ...content } = category;
      await ok(`admin/categories/${id}`, 'PUT', { ...content, name: 'QA 更新分类' });
      assert.equal(
        (await ok('public/site')).categories.find((c: any) => c.id === id).name,
        'QA 更新分类',
      );
    });
    await t.test('草稿隔离与空正文发布检查', async () => {
      article = await ok('admin/articles', 'POST', {
        slug: prefix,
        categoryId: categories[0],
        sort: 999,
        content: { title: 'QA 初稿', type: 'INTERNAL', body: null },
      });
      articles.push(article.id);
      assert.equal((await call(`public/articles/${prefix}`)).r.status, 404);
      assert.equal((await call(`admin/articles/${article.id}/publish`, 'POST')).r.status, 400);
      const p = await ok('admin/preview', 'POST', { kind: 'article', id: article.id });
      const preview = await ok(`preview?token=${new URL(p.url).searchParams.get('token')}`);
      assert.equal(preview.previewArticle.title, 'QA 初稿');
      assert.equal((await call('preview?token=invalid')).r.status, 403);
      assert.equal((await call('preview')).r.status, 403);
      const payload = Buffer.from(
        JSON.stringify({ kind: 'site', id: 'site', exp: Date.now() - 1 }),
      ).toString('base64url');
      const signed = `${payload}.${createHmac('sha256', process.env.REVALIDATE_SECRET!).update(payload).digest('hex')}`;
      assert.equal((await call(`preview?token=${signed}`)).r.status, 403);
    });
    await t.test('本地媒体草稿私有与发布公开', async () => {
      const png = await sharp({
        create: { width: 32, height: 32, channels: 3, background: '#b6a1e4' },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      form.set('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), `${prefix}.png`);
      const m = await ok('admin/media', 'POST', form);
      media.push(m);
      assert.equal(await publicStatus(m.key), 404);
      assert.equal((await fetch(`${base}/api/v1/media/private/${m.key}`)).status, 401);
      assert.equal(
        (await fetch(`${base}/api/v1/media/private/${m.key}`, { headers: { cookie } })).status,
        200,
      );
      const bad = new FormData();
      bad.set('file', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'bad.svg');
      assert.equal((await call('admin/media', 'POST', bad)).r.status, 400);
      article = await ok(`admin/articles/${article.id}`, 'PUT', {
        slug: prefix,
        categoryId: categories[0],
        sort: 999,
        revision: article.revision,
        content: { ...article.draft, body, cover: `/media/${m.key}` },
      });
      await ok(`admin/articles/${article.id}/publish`, 'POST');
      await until(async () => (await publicStatus(m.key)) === 200, '发布媒体');
      const html = await (await fetch(`${process.env.WEB_ORIGIN}/articles/${prefix}`)).text();
      assert.ok(html.includes('集成测试正文'));
    });
    await t.test('站点导航、模块与文章卡片的草稿隔离和发布对应', async () => {
      const original = await db.setting.findUniqueOrThrow({ where: { key: 'site' } });
      const draft = siteSchema.parse(original.draft);
      const publicBefore = (await ok('public/site')).site;
      const label = `${prefix}-按钮`;
      try {
        const content = {
          ...draft,
          tags: ['独立设计师 QA', 'AI 探索者', '自定义身份'],
          headerButton: { label, url: '#articles', newTab: false, visible: true },
          navigation: [
            { id: 'qa', label: '测试导航', href: '#articles', newTab: false, visible: true },
          ],
          modules: { ...draft.modules, courses: false },
          collections: [{ categoryId: categories[0], articleIds: [article.id] }],
        };
        assert.equal(
          (
            await call('admin/site', 'PUT', {
              content: {
                ...content,
                headerButton: { ...content.headerButton, url: 'javascript:alert(1)' },
              },
              revision: original.revision,
            })
          ).r.status,
          400,
        );
        assert.equal(
          (
            await call('admin/site', 'PUT', {
              content: {
                ...content,
                collections: [{ categoryId: categories[1], articleIds: [article.id] }],
              },
              revision: original.revision,
            })
          ).r.status,
          400,
        );
        const saved = await ok('admin/site', 'PUT', { content, revision: original.revision });
        assert.equal(saved.draft.headerButton.label, label);
        assert.deepEqual((await ok('public/site')).site, publicBefore);
        const preview = await ok('admin/preview', 'POST', { kind: 'site' });
        assert.equal(
          (await ok(`preview?token=${new URL(preview.url).searchParams.get('token')}`)).site
            .headerButton.label,
          label,
        );
        await ok('admin/site/publish', 'POST');
        const published = await ok('public/site');
        assert.equal(published.site.headerButton.label, label);
        assert.deepEqual(published.site.tags, content.tags);
        assert.equal(published.site.navigation[0].label, '测试导航');
        assert.equal(published.site.modules.courses, false);
        assert.equal(published.site.collections[0].articleIds[0], article.id);
        await until(async () => {
          const html = await (await fetch(process.env.WEB_ORIGIN!)).text();
          return (
            html.includes(label) && html.includes('测试导航') && !html.includes('id="courses"')
          );
        }, '站点配置同步前台');
      } finally {
        await db.setting.update({
          where: { key: 'site' },
          data: {
            draft: original.draft as any,
            published: original.published as any,
            revision: { increment: 1 },
          },
        });
        await db.publicContentRevision.update({
          where: { id: 'public' },
          data: { revision: { increment: 1 } },
        });
        await db.publishJob.create({ data: {} });
        const versions = await db.contentVersion.findMany({ where: { settingKey: 'site' } });
        await db.contentVersion.deleteMany({
          where: {
            id: {
              in: versions
                .filter((v) => (v.snapshot as any)?.headerButton?.label === label)
                .map((v) => v.id),
            },
          },
        });
      }
    });
    await t.test('公开版本保持标题、分类和排序；冲突与恢复', async () => {
      const revision = article.revision;
      article = await ok(`admin/articles/${article.id}`, 'PUT', {
        slug: prefix,
        categoryId: categories[1],
        sort: 0,
        revision,
        content: { ...article.draft, title: 'QA 第二稿' },
      });
      assert.equal(
        (
          await call(`admin/articles/${article.id}`, 'PUT', {
            slug: prefix,
            categoryId: categories[0],
            revision,
            content: article.draft,
          })
        ).r.status,
        409,
      );
      const published = await ok(`public/articles/${prefix}`);
      assert.equal(published.title, 'QA 初稿');
      assert.equal(published.categoryId, categories[0]);
      assert.equal(published.sort, 999);
      const site = await ok('public/site');
      assert.equal(site.articles.find((a: any) => a.id === article.id).categoryId, categories[0]);
      assert.equal((await call(`admin/categories/${categories[0]}`, 'DELETE')).r.status, 409);
      const versions = await ok(`admin/articles/${article.id}/versions`);
      assert.ok(versions.length >= 2);
      article = await ok(`admin/articles/${article.id}/restore/${versions[0].id}`, 'POST');
      assert.equal(article.draft.title, 'QA 初稿');
      assert.equal((await call(`admin/media/${media[0].id}`, 'DELETE')).r.status, 409);
      await ok(`admin/articles/${article.id}/unpublish`, 'POST');
      assert.equal((await call(`public/articles/${prefix}`)).r.status, 404);
      await until(async () => (await publicStatus(media[0].key)) === 404, '下线媒体撤回');
    });
    await t.test('并行编辑只有一个版本能保存', async () => {
      const input = {
        slug: prefix,
        categoryId: article.categoryId,
        sort: article.sort,
        revision: article.revision,
        content: article.draft,
      };
      const results = await Promise.all([
        call(`admin/articles/${article.id}`, 'PUT', input),
        call(`admin/articles/${article.id}`, 'PUT', input),
      ]);
      assert.deepEqual(results.map((x) => x.r.status).sort(), [200, 409]);
    });
    await t.test('账号改密、撤销其他会话与旧会话失效', async () => {
      const password = randomBytes(20).toString('hex'),
        newPassword = randomBytes(20).toString('hex');
      const user = await db.user.create({
        data: { username: prefix, passwordHash: await argon2.hash(password) },
      });
      const owner = { cookie, csrf };
      try {
        for (let i = 0; i < 2; i++) {
          const login = await call('auth/login', 'POST', { username: prefix, password });
          assert.equal(login.r.status, 201);
          cookie = login.r.headers.get('set-cookie')!.split(';')[0];
          csrf = login.data.csrf;
        }
        assert.equal((await ok('auth/account')).sessions.length, 2);
        await ok('auth/revoke-others', 'POST');
        assert.equal((await ok('auth/account')).sessions.length, 1);
        assert.equal(
          (await call('auth/password', 'POST', { currentPassword: 'incorrect', newPassword })).r
            .status,
          403,
        );
        await ok('auth/password', 'POST', { currentPassword: password, newPassword });
        assert.equal((await call('auth/me')).r.status, 401);
        const login = await call('auth/login', 'POST', { username: prefix, password: newPassword });
        assert.equal(login.r.status, 201);
      } finally {
        cookie = owner.cookie;
        csrf = owner.csrf;
        await db.user.delete({ where: { id: user.id } });
      }
    });
    await t.test('发布队列成功完成与退出会话', async () => {
      await until(
        async () =>
          !(await ok('admin/dashboard')).jobs.some(
            (j: any) => j.status === 'PENDING' || j.status === 'RUNNING',
          ),
        '发布任务同步',
      );
      const dashboard = await ok('admin/dashboard');
      assert.ok(dashboard.jobs.some((j: any) => j.status === 'DONE'));
      assert.ok(!dashboard.jobs.some((j: any) => j.status === 'FAILED'));
      await ok('auth/logout', 'POST');
      assert.equal((await call('auth/me')).r.status, 401);
    });
  } finally {
    // Only fixtures created by this invocation are deleted; seed/user content is untouched.
    await db.article.deleteMany({ where: { id: { in: articles }, slug: { startsWith: prefix } } });
    await db.category.deleteMany({
      where: { id: { in: categories }, slug: { startsWith: prefix } },
    });
    for (const m of media) {
      await db.media.delete({ where: { id: m.id } });
      for (const [folder, key] of [
        ['private/originals', m.key],
        ['public', m.key],
        ...Object.values(m.variants || {}).flatMap((k) => [
          ['private/variants', k],
          ['public', k],
        ]),
      ])
        await fs
          .unlink(path.join(process.env.MEDIA_ROOT!, folder as string, key as string))
          .catch(() => {});
    }
    await db.publicContentRevision.update({
      where: { id: 'public' },
      data: { revision: { increment: 1 } },
    });
    await db.auditLog.deleteMany({ where: { target: { in: articles } } });
    await db.$disconnect();
  }
});
