import {
  Injectable,
  Inject,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaClient, Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as argon2 from 'argon2';
import sharp from 'sharp';
import { z } from 'zod';
import { PublicCache } from './cache';
import { articleInput, articleSchema, categorySchema, siteSchema } from './validation';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const mediaRoot = () =>
  path.resolve(__dirname, '../../..', process.env.MEDIA_ROOT || '../personal-site-data/media');
const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9_.-]+$/.test(key) || key.startsWith('.'))
    throw new BadRequestException('文件名无效');
  return key;
};
const assertOrigin = (req: Request) => {
  const origin = req.headers.origin;
  if (!origin || ![process.env.WEB_ORIGIN, process.env.ADMIN_ORIGIN].includes(origin))
    throw new ForbiddenException('请求来源无效');
};
@Injectable()
export class DbService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
@Injectable()
export class AuthService {
  constructor(@Inject(DbService) public db: DbService) {}
  failures = new Map<string, { count: number; until: number }>();
  async session(req: Request) {
    const token = req.cookies?.site_session;
    if (typeof token !== 'string') throw new UnauthorizedException('请先登录');
    const session = await this.db.session.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) throw new UnauthorizedException('登录已过期');
    return session;
  }
  async login(req: Request, res: Response, body: unknown) {
    assertOrigin(req);
    const data = z
      .object({ username: z.string().max(80), password: z.string().max(200) })
      .parse(body);
    const key = `${req.ip}:${data.username}`;
    const attempt = this.failures.get(key);
    if (attempt && attempt.until > Date.now() && attempt.count >= 5)
      throw new HttpExceptionCompat();
    const user = await this.db.user.findUnique({ where: { username: data.username } });
    if (!user || !(await argon2.verify(user.passwordHash, data.password))) {
      this.failures.set(key, {
        count: (attempt?.until! > Date.now() ? attempt?.count || 0 : 0) + 1,
        until: Date.now() + 15 * 60000,
      });
      throw new UnauthorizedException('账号或密码错误');
    }
    this.failures.delete(key);
    const token = randomBytes(32).toString('hex'),
      csrf = randomBytes(24).toString('hex');
    await this.db.session.create({
      data: {
        tokenHash: hash(token),
        csrf,
        userId: user.id,
        expiresAt: new Date(Date.now() + 12 * 3600000),
      },
    });
    res.cookie('site_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 12 * 3600000,
      path: '/',
    });
    return { username: user.username, role: user.role, csrf };
  }
}
class HttpExceptionCompat extends ForbiddenException {
  constructor() {
    super('尝试次数过多，请 15 分钟后重试');
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { session: any }>();
    const s = await this.auth.session(req);
    if (s.user.role !== 'ADMIN') throw new ForbiddenException('权限不足');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      assertOrigin(req);
      if (req.headers['x-csrf-token'] !== s.csrf)
        throw new ForbiddenException('会话校验失败，请重新登录');
    }
    req.session = s;
    return true;
  }
}
@Injectable()
export class ContentService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(DbService) public db: DbService,
    @Inject(PublicCache) public cache: PublicCache,
  ) {}
  timer?: ReturnType<typeof setInterval>;
  busy = false;
  async onModuleInit() {
    await fs.mkdir(path.join(mediaRoot(), 'public'), { recursive: true });
    if (process.env.PUBLISH_WORKER_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.runJobs(), 4000);
    this.timer.unref();
    await this.db.publishJob.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'PENDING' },
    });
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  async publicRevision() {
    return (await this.db.publicContentRevision.findUniqueOrThrow({ where: { id: 'public' } }))
      .revision;
  }
  async publicArticle(slug: string) {
    const revision = await this.publicRevision();
    const result = await this.cache.remember(revision, `article:${hash(slug)}`, async () => {
      const a = await this.db.article.findUnique({ where: { slug } });
      if (!a || a.status !== 'PUBLISHED' || !a.published) return null;
      return { id: a.id, slug: a.slug, categoryId: a.categoryId, ...(a.published as object) };
    });
    if (!result) throw new NotFoundException('文章不存在');
    return result;
  }
  async publicSite() {
    const revision = await this.publicRevision();
    return this.cache.remember(revision, 'site', () => this.loadPublicSite());
  }
  private async loadPublicSite() {
    const [site, categories, articles] = await Promise.all([
      this.db.setting.findUnique({ where: { key: 'site' } }),
      this.db.category.findMany({ orderBy: { sort: 'asc' } }),
      this.db.article.findMany({
        where: { status: 'PUBLISHED', published: { not: Prisma.DbNull } },
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, slug: true, categoryId: true, published: true, publishedAt: true },
      }),
    ]);
    return {
      site: site?.published ? siteSchema.parse(site.published) : null,
      categories,
      articles: articles
        .map((a) => ({
          id: a.id,
          slug: a.slug,
          categoryId: a.categoryId,
          publishedAt: a.publishedAt,
          ...(a.published as object),
        }))
        .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0)),
    };
  }
  async audit(actor: string, action: string, target: string) {
    await this.db.auditLog.create({ data: { actor, action, target } });
  }
  async syncMedia() {
    const [settings, articles] = await Promise.all([
      this.db.setting.findMany(),
      this.db.article.findMany(),
    ]);
    const refs = new Set<string>();
    const visit = (v: any) => {
      if (typeof v === 'string') {
        if (v.startsWith('/media/')) refs.add(v.slice(7));
      } else if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') Object.values(v).forEach(visit);
    };
    settings.forEach((s) => visit(s.published));
    articles.filter((a) => a.status === 'PUBLISHED').forEach((a) => visit(a.published));
    const media = await this.db.media.findMany({ where: { deletedAt: null } });
    for (const m of media) {
      if (refs.has(m.key)) {
        for (const key of [m.key, ...Object.values((m.variants || {}) as Record<string, string>)]) {
          safeKey(key);
          const source = path.join(
            mediaRoot(),
            'private',
            key === m.key ? 'originals' : 'variants',
            key,
          );
          await fs.copyFile(source, path.join(mediaRoot(), 'public', key));
        }
      }
    }
    const allowed = new Set<string>();
    for (const m of media)
      if (refs.has(m.key)) {
        allowed.add(m.key);
        Object.values((m.variants || {}) as Record<string, string>).forEach((k) => allowed.add(k));
      }
    for (const key of await fs.readdir(path.join(mediaRoot(), 'public')))
      if (!allowed.has(key)) await fs.unlink(path.join(mediaRoot(), 'public', safeKey(key)));
  }
  async runJobs() {
    if (this.busy) return;
    this.busy = true;
    try {
      const jobs = await this.db.publishJob.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });
      for (const job of jobs) {
        await this.db.publishJob.update({
          where: { id: job.id },
          data: { status: 'RUNNING', attempts: { increment: 1 } },
        });
        try {
          await this.syncMedia();
          const result = await fetch(
            `${process.env.WEB_INTERNAL_URL || process.env.WEB_ORIGIN}/api/revalidate`,
            {
              method: 'POST',
              headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET! },
              signal: AbortSignal.timeout(12000),
            },
          );
          if (!result.ok) throw new Error(`页面刷新返回 ${result.status}`);
          await this.db.publishJob.update({
            where: { id: job.id },
            data: { status: 'DONE', error: null },
          });
        } catch (error) {
          await this.db.publishJob.update({
            where: { id: job.id },
            data: {
              status: job.attempts >= 4 ? 'FAILED' : 'PENDING',
              error: String(error).slice(0, 2000),
            },
          });
        }
      }
    } catch (error) {
      console.error('publish jobs', error);
    } finally {
      this.busy = false;
    }
  }
  previewToken(kind: string, id: string) {
    const body = Buffer.from(JSON.stringify({ kind, id, exp: Date.now() + 15 * 60000 })).toString(
      'base64url',
    );
    return `${body}.${createHmac('sha256', process.env.REVALIDATE_SECRET!).update(body).digest('hex')}`;
  }
  verifyPreview(token: string) {
    if (typeof token !== 'string' || token.length > 3000 || token.split('.').length !== 2)
      throw new ForbiddenException('预览链接无效');
    const [body, sig] = token.split('.');
    if (!body || !sig || sig.length !== 64) throw new ForbiddenException('预览链接无效');
    const expected = createHmac('sha256', process.env.REVALIDATE_SECRET!)
      .update(body)
      .digest('hex');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      throw new ForbiddenException('预览链接无效');
    let data: any;
    try {
      data = z
        .object({ kind: z.enum(['site', 'article']), id: z.string().max(100), exp: z.number() })
        .parse(JSON.parse(Buffer.from(body, 'base64url').toString()));
    } catch {
      throw new ForbiddenException('预览链接无效');
    }
    if (data.exp < Date.now()) throw new ForbiddenException('预览链接已过期');
    return data;
  }
}
@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private auth: AuthService) {}
  @Get('account') @UseGuards(AuthGuard) async account(@Req() req: any) {
    return {
      username: req.session.user.username,
      sessions: await this.auth.db.session.findMany({
        where: { userId: req.session.user.id, expiresAt: { gt: new Date() } },
        select: { id: true, expiresAt: true },
      }),
      currentSessionId: req.session.id,
    };
  }
  @Post('revoke-others') @UseGuards(AuthGuard) async revokeOthers(@Req() req: any) {
    await this.auth.db.session.deleteMany({
      where: { userId: req.session.user.id, id: { not: req.session.id } },
    });
    return { ok: true };
  }
  @Post('password') @UseGuards(AuthGuard) async password(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const data = z
      .object({
        currentPassword: z.string().max(200),
        newPassword: z.string().min(12, '新密码至少 12 个字符').max(200),
      })
      .parse(body);
    if (!(await argon2.verify(req.session.user.passwordHash, data.currentPassword)))
      throw new ForbiddenException('当前密码不正确');
    if (data.currentPassword === data.newPassword)
      throw new BadRequestException('新密码不能与当前密码相同');
    const passwordHash = await argon2.hash(data.newPassword);
    await this.auth.db.$transaction([
      this.auth.db.user.update({ where: { id: req.session.user.id }, data: { passwordHash } }),
      this.auth.db.session.deleteMany({ where: { userId: req.session.user.id } }),
    ]);
    res.clearCookie('site_session', { path: '/' });
    return { ok: true };
  }
  @Post('login') login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    return this.auth.login(req, res, body);
  }
  @Get('me') async me(@Req() req: Request) {
    const s = await this.auth.session(req);
    return { username: s.user.username, role: s.user.role, csrf: s.csrf };
  }
  @Post('logout') @UseGuards(AuthGuard) async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const s = await this.auth.session(req);
    await this.auth.db.session.delete({ where: { id: s.id } });
    res.clearCookie('site_session', { path: '/' });
    return { ok: true };
  }
}
@Controller('api/v1')
export class ApiController {
  constructor(
    @Inject(ContentService) private content: ContentService,
    @Inject(DbService) private db: DbService,
  ) {}
  @Get('health') async health() {
    await this.db.$queryRaw`SELECT 1`;
    return {
      ok: true,
      cache: this.content.cache.status(),
      database: 'mysql',
      version: (await this.db.$queryRaw<any[]>`SELECT VERSION() AS version`)[0].version,
    };
  }
  @Get('public/site') site(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.content.publicSite();
  }
  @Get('public/articles/:slug') async article(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.content.publicArticle(slug);
  }
  @Get('preview') async preview(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    const data = this.content.verifyPreview(token);
    const result = await this.content.publicSite();
    if (data.kind === 'site') {
      const s = await this.db.setting.findUniqueOrThrow({ where: { key: 'site' } });
      return { ...result, site: s.draft };
    }
    const a = await this.db.article.findUnique({ where: { id: data.id } });
    if (!a) throw new NotFoundException();
    return { ...result, previewArticle: { slug: a.slug, ...(a.draft as object) } };
  }
}
@Controller('api/v1/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(ContentService) private content: ContentService,
  ) {}
  @Get('dashboard') async dashboard() {
    const [articles, published, media, categories, jobs, logs] = await Promise.all([
      this.db.article.count(),
      this.db.article.count({ where: { status: 'PUBLISHED' } }),
      this.db.media.count({ where: { deletedAt: null } }),
      this.db.category.count(),
      this.db.publishJob.findMany({ take: 8, orderBy: { createdAt: 'desc' } }),
      this.db.auditLog.findMany({ take: 12, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      articles,
      published,
      media,
      categories,
      jobs,
      logs,
      cache: this.content.cache.status(),
    };
  }
  @Get('site') site() {
    return this.db.setting.findUnique({ where: { key: 'site' } });
  }
  private async validateCollections(
    tx: Prisma.TransactionClient,
    data: z.infer<typeof siteSchema>,
  ) {
    for (const collection of data.collections) {
      if (!(await tx.category.findUnique({ where: { id: collection.categoryId } })))
        throw new BadRequestException('文件夹分类已删除，请重新选择');
      const articles = await tx.article.findMany({ where: { id: { in: collection.articleIds } } });
      for (const id of collection.articleIds) {
        const article = articles.find((a) => a.id === id);
        const published = article?.published as any;
        if (
          !article ||
          !published ||
          (published.categoryId || article.categoryId) !== collection.categoryId
        )
          throw new BadRequestException('展示文章必须已发布且属于对应文件夹分类');
      }
    }
  }
  @Put('site') async saveSite(@Body() body: any) {
    const data = siteSchema.parse(body.content);
    return this.db.$transaction(async (tx) => {
      await this.validateCollections(tx, data);
      const current = await tx.setting.findUnique({ where: { key: 'site' } });
      if (current && body.revision !== current.revision)
        throw new ConflictException('内容已被更新，请刷新后再编辑');
      if (current) {
        const locked = await tx.setting.updateMany({
          where: { key: 'site', revision: current.revision },
          data: { revision: { increment: 1 } },
        });
        if (!locked.count) throw new ConflictException('内容已被更新，请刷新后再编辑');
      }
      if (current)
        await tx.contentVersion.create({
          data: {
            settingKey: 'site',
            revision: current.revision,
            snapshot: current.draft as Prisma.InputJsonValue,
          },
        });
      return tx.setting.upsert({
        where: { key: 'site' },
        create: { key: 'site', draft: json(data) },
        update: { draft: json(data) },
      });
    });
  }
  @Post('site/publish') async publishSite(@Req() req: any) {
    await this.db.$transaction(async (tx) => {
      const s = await tx.setting.findUniqueOrThrow({ where: { key: 'site' } });
      const data = siteSchema.parse(s.draft);
      await this.validateCollections(tx, data);
      await tx.setting.update({
        where: { key: 'site' },
        data: { published: json(data) },
      });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
    });
    await this.content.audit(req.session.user.username, '发布站点', 'site');
    return { ok: true, message: '已保存发布版本，正在同步媒体与页面' };
  }
  @Get('site/versions') siteVersions() {
    return this.db.contentVersion.findMany({
      where: { settingKey: 'site' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
  @Post('site/restore/:id') async restoreSite(@Param('id') id: string) {
    const version = await this.db.contentVersion.findUnique({ where: { id } });
    if (!version || version.settingKey !== 'site') throw new NotFoundException();
    const current = await this.db.setting.findUniqueOrThrow({ where: { key: 'site' } });
    return this.saveSite({ content: version.snapshot, revision: current.revision });
  }
  @Get('categories') categories() {
    return this.db.category.findMany({ orderBy: { sort: 'asc' } });
  }
  @Post('categories') createCategory(@Body() body: unknown) {
    return this.db.$transaction(async (tx) => {
      const value = await tx.category.create({ data: categorySchema.parse(body) });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
      return value;
    });
  }
  @Put('categories/:id') async updateCategory(@Param('id') id: string, @Body() body: unknown) {
    return this.db.$transaction(async (tx) => {
      const value = await tx.category.update({ where: { id }, data: categorySchema.parse(body) });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
      return value;
    });
  }
  @Delete('categories/:id') async deleteCategory(@Param('id') id: string) {
    const articles = await this.db.article.findMany({ where: { status: 'PUBLISHED' } });
    if (articles.some((a) => (a.published as any)?.categoryId === id))
      throw new ConflictException('该分类仍被已发布版本使用，请先重新发布文章');
    return this.db.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
      return { ok: true };
    });
  }
  @Get('articles') articles() {
    return this.db.article.findMany({
      include: { category: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }
  @Post('articles') async createArticle(@Body() body: unknown) {
    const data = articleInput.parse(body);
    return this.db.article.create({
      data: {
        slug: data.slug,
        categoryId: data.categoryId,
        sort: data.sort,
        draft: json(data.content),
      },
    });
  }
  @Put('articles/:id') async updateArticle(@Param('id') id: string, @Body() body: unknown) {
    const data = articleInput.parse(body);
    return this.db.$transaction(async (tx) => {
      const a = await tx.article.findUnique({ where: { id } });
      if (!a) throw new NotFoundException();
      if (data.revision !== a.revision) throw new ConflictException('文章已被更新，请刷新后再编辑');
      if (data.slug !== a.slug && a.published)
        throw new ConflictException('已发布文章修改 slug 前请先下线');
      const locked = await tx.article.updateMany({
        where: { id, revision: a.revision },
        data: { revision: { increment: 1 } },
      });
      if (!locked.count) throw new ConflictException('文章已被更新，请刷新后再编辑');
      await tx.contentVersion.create({
        data: { articleId: id, revision: a.revision, snapshot: a.draft as Prisma.InputJsonValue },
      });
      return tx.article.update({
        where: { id },
        data: {
          slug: data.slug,
          categoryId: data.categoryId,
          sort: data.sort,
          draft: json(data.content),
        },
      });
    });
  }
  @Post('articles/:id/publish') async publishArticle(@Param('id') id: string, @Req() req: any) {
    await this.db.$transaction(async (tx) => {
      const a = await tx.article.findUniqueOrThrow({ where: { id } });
      const draft = articleSchema.parse(a.draft);
      if (
        draft.type === 'INTERNAL' &&
        !JSON.stringify(draft.body || {}).match(/"text":"[^"\s]|"type":"image"/)
      )
        throw new BadRequestException('站内文章需要填写正文后再发布');
      await tx.article.update({
        where: { id },
        data: {
          published: json({ ...(a.draft as object), categoryId: a.categoryId, sort: a.sort }),
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
    });
    await this.content.audit(req.session.user.username, '发布文章', id);
    return { ok: true };
  }
  @Post('articles/:id/unpublish') async unpublish(@Param('id') id: string, @Req() req: any) {
    await this.db.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: { status: 'DRAFT', published: Prisma.DbNull },
      });
      await tx.publicContentRevision.update({
        where: { id: 'public' },
        data: { revision: { increment: 1 } },
      });
      await tx.publishJob.create({ data: {} });
    });
    await this.content.audit(req.session.user.username, '下线文章', id);
    return { ok: true };
  }
  @Get('articles/:id/versions') versions(@Param('id') id: string) {
    return this.db.contentVersion.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
  @Post('articles/:id/restore/:version') async restore(
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    const v = await this.db.contentVersion.findUnique({ where: { id: version } });
    if (!v || v.articleId !== id) throw new NotFoundException();
    const a = await this.db.article.findUniqueOrThrow({ where: { id } });
    return this.updateArticle(id, {
      slug: a.slug,
      categoryId: a.categoryId,
      sort: a.sort,
      revision: a.revision,
      content: v.snapshot,
    });
  }
  @Post('preview') preview(@Body() body: any) {
    const kind = z.enum(['site', 'article']).parse(body.kind);
    return {
      url: `${process.env.WEB_ORIGIN}/preview?token=${this.content.previewToken(
        kind,
        z
          .string()
          .max(100)
          .parse(body.id || 'site'),
      )}`,
    };
  }
  @Get('media') media() {
    return this.db.media.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }
  @Get('media/:id/references') async references(@Param('id') id: string) {
    const media = await this.db.media.findUniqueOrThrow({ where: { id } });
    const needle = `/media/${media.key}`;
    const [settings, articles, versions] = await Promise.all([
      this.db.setting.findMany(),
      this.db.article.findMany(),
      this.db.contentVersion.findMany(),
    ]);
    const refs: any[] = [];
    const has = (v: unknown) => JSON.stringify(v).includes(needle);
    for (const s of settings) {
      if (has(s.draft)) refs.push({ label: '站点草稿', kind: '草稿' });
      if (has(s.published)) refs.push({ label: '站点公开版本', kind: '已发布' });
    }
    for (const a of articles) {
      if (has(a.draft)) refs.push({ label: (a.draft as any).title, kind: '文章草稿' });
      if (has(a.published)) refs.push({ label: (a.published as any).title, kind: '已发布文章' });
    }
    for (const v of versions)
      if (has(v.snapshot))
        refs.push({ label: `${v.settingKey ? '站点' : '文章'} V${v.revision}`, kind: '历史版本' });
    return refs;
  }
  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择图片');
    const meta = await sharp(file.buffer, { limitInputPixels: 40_000_000, animated: false })
      .metadata()
      .catch(() => null);
    if (!meta || !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(meta.format || ''))
      throw new BadRequestException('支持 PNG、JPG、WebP、AVIF、GIF 图片，最大 12 MB');
    const ext = meta.format === 'jpeg' ? 'jpg' : meta.format!;
    const key = `${randomBytes(16).toString('hex')}.${ext}`,
      thumb = `${key}.thumb.webp`;
    await fs.mkdir(path.join(mediaRoot(), 'private/originals'), { recursive: true });
    await fs.mkdir(path.join(mediaRoot(), 'private/variants'), { recursive: true });
    await fs.writeFile(path.join(mediaRoot(), 'private/originals', key), file.buffer, {
      flag: 'wx',
    });
    try {
      await sharp(file.buffer)
        .rotate()
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(mediaRoot(), 'private/variants', thumb));
      return await this.db.media.create({
        data: {
          key,
          filename: file.originalname.slice(0, 255),
          mime: `image/${meta.format === 'jpg' ? 'jpeg' : meta.format}`,
          size: file.size,
          width: meta.width,
          height: meta.height,
          variants: { thumb },
        },
      });
    } catch (e) {
      await fs.unlink(path.join(mediaRoot(), 'private/originals', key)).catch(() => {});
      await fs.unlink(path.join(mediaRoot(), 'private/variants', thumb)).catch(() => {});
      throw e;
    }
  }
  @Patch('media/:id') updateMedia(@Param('id') id: string, @Body() body: unknown) {
    return this.db.media.update({
      where: { id },
      data: z.object({ alt: z.string().max(500) }).parse(body),
    });
  }
  @Delete('media/:id') async removeMedia(@Param('id') id: string) {
    const m = await this.db.media.findUniqueOrThrow({ where: { id } });
    const [settings, articles, versions] = await Promise.all([
      this.db.setting.findMany(),
      this.db.article.findMany(),
      this.db.contentVersion.findMany(),
    ]);
    if (JSON.stringify([settings, articles, versions]).includes(`/media/${m.key}`))
      throw new ConflictException('此图片仍被内容或历史版本引用，请保留');
    return this.db.media.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  @Post('jobs/:id/retry') retry(@Param('id') id: string) {
    return this.db.publishJob.update({
      where: { id },
      data: { status: 'PENDING', attempts: 0, error: null },
    });
  }
}
@Controller()
export class FileController {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(AuthService) private auth: AuthService,
    @Inject(ContentService) private content: ContentService,
  ) {}
  @Get('media/:key') async publicFile(@Param('key') key: string, @Res() res: Response) {
    safeKey(key);
    const filename = path.join(mediaRoot(), 'public', key);
    try {
      await fs.access(filename);
    } catch {
      throw new NotFoundException('文件未发布或不存在');
    }
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // The configured media root may be in .local; safeKey prevents path traversal.
    res.sendFile(filename, { dotfiles: 'allow' });
  }
  @Get('api/v1/media/private/:key') async privateFile(
    @Param('key') key: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (token) this.content.verifyPreview(token);
    else await this.auth.session(req);
    safeKey(key);
    const media = await this.db.media.findFirst({ where: { key, deletedAt: null } });
    if (!media) throw new NotFoundException();
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.join(mediaRoot(), 'private/originals', key), { dotfiles: 'allow' });
  }
}
