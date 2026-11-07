import { config } from 'dotenv';
config({ quiet: true });
import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { isDeepStrictEqual } from 'node:util';
import { normalizeSite } from '../packages/contracts/site-config';
import type { Site } from '../packages/contracts/types';

const db = new PrismaClient();
async function main() {
  const directory = path.resolve(process.env.MEDIA_ROOT!);
  const icons: Record<string, string> = {};
  for (const platform of ['wechat', 'xiaohongshu', 'douyin']) {
    const filename = `official-${platform}.svg`;
    const buffer = await fs.readFile(path.join('seed-assets', filename));
    const key = `seed-${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 20)}.svg`;
    icons[platform] = `/media/${key}`;
    await fs.mkdir(path.join(directory, 'private/originals'), { recursive: true });
    await fs.writeFile(path.join(directory, 'private/originals', key), buffer);
    const meta = await sharp(buffer).metadata();
    await db.media.upsert({
      where: { key },
      create: {
        key,
        filename,
        mime: 'image/svg+xml',
        size: buffer.length,
        width: meta.width,
        height: meta.height,
        alt: `${platform} 品牌图标`,
      },
      update: {},
    });
  }
  const patch = (value: Prisma.JsonValue) => {
    const site = normalizeSite(value as unknown as Site);
    return JSON.parse(
      JSON.stringify({
        ...site,
        wechatIcon: icons.wechat,
        socials: site.socials.map((s) => ({
          ...s,
          icon: s.name === '小红书' ? icons.xiaohongshu : s.name === '抖音' ? icons.douyin : s.icon,
        })),
      }),
    ) as Prisma.InputJsonObject;
  };
  const changed = await db.$transaction(async (tx) => {
    const current = await tx.setting.findUniqueOrThrow({ where: { key: 'site' } });
    const draft = patch(current.draft);
    const published = current.published ? patch(current.published) : Prisma.DbNull;
    if (
      isDeepStrictEqual(draft, current.draft) &&
      (!current.published || isDeepStrictEqual(published, current.published))
    )
      return false;
    const locked = await tx.setting.updateMany({
      where: { key: 'site', revision: current.revision },
      data: { draft, published, revision: { increment: 1 } },
    });
    if (!locked.count) throw new Error('站点已由其他编辑更新，请重试');
    await tx.contentVersion.create({
      data: {
        settingKey: 'site',
        revision: current.revision,
        snapshot: current.draft as Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({
      data: {
        actor: 'local-maintenance',
        action: '补齐导航与模块配置并更新品牌图标',
        target: 'site',
      },
    });
    await tx.publicContentRevision.update({
      where: { id: 'public' },
      data: { revision: { increment: 1 } },
    });
    await tx.publishJob.create({ data: {} });
    return true;
  });
  console.log(
    changed
      ? '已补齐站点配置并更新本地品牌图标，等待发布同步。'
      : '配置和图标已是当前版本，无需更新。',
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
