import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const local = path.join(root, '.local');
const envPath = path.join(root, '.env');
fs.mkdirSync(local, { recursive: true });
if (fs.existsSync(envPath)) {
  console.log('.env 已存在，未覆盖。检查配置后启动 MySQL、Redis 和应用。');
  process.exit(0);
}
const secret = () => randomBytes(24).toString('hex');
const dbPassword = secret();
const adminPassword = randomBytes(18).toString('base64url');
const apiPort = process.env.DEV_API_PORT || '4000';
const webPort = process.env.DEV_WEB_PORT || '3000';
const adminPort = process.env.DEV_ADMIN_PORT || '5173';
const mysqlPort = process.env.DEV_MYSQL_PORT || '13306';
const redisPort = process.env.DEV_REDIS_PORT || '16379';
const media = path.join(root, '.local/media').replaceAll('\\', '/');
fs.writeFileSync(
  envPath,
  [
    `MYSQL_PASSWORD=${dbPassword}`,
    `MYSQL_ROOT_PASSWORD=${secret()}`,
    `DEV_MYSQL_PORT=${mysqlPort}`,
    `DEV_REDIS_PORT=${redisPort}`,
    `DATABASE_URL=mysql://personal_site:${dbPassword}@127.0.0.1:${mysqlPort}/personal_site`,
    `REDIS_URL=redis://127.0.0.1:${redisPort}/0`,
    'REDIS_KEY_PREFIX=senyu:dev:public',
    `MEDIA_ROOT=${media}`,
    `PORT=${apiPort}`,
    `WEB_PORT=${webPort}`,
    'HOST=127.0.0.1',
    `WEB_ORIGIN=http://localhost:${webPort}`,
    `ADMIN_ORIGIN=http://localhost:${adminPort}`,
    `API_INTERNAL_URL=http://127.0.0.1:${apiPort}`,
    `WEB_INTERNAL_URL=http://127.0.0.1:${webPort}`,
    `NEXT_PUBLIC_SITE_URL=http://localhost:${webPort}`,
    `REVALIDATE_SECRET=${secret()}`,
    'ADMIN_USERNAME=admin',
    `ADMIN_PASSWORD=${adminPassword}`,
    'COOKIE_SECURE=false',
    '',
  ].join('\n'),
  { mode: 0o600, flag: 'wx' },
);
fs.writeFileSync(
  path.join(local, '登录信息.md'),
  `# 本地开发账号\n\n前台：http://localhost:${webPort}/\n\n后台：http://localhost:${adminPort}/admin/\n\n账号：admin\n\n密码：${adminPassword}\n\n仅供本地开发，请勿提交或公开此文件。\n`,
  { mode: 0o600, flag: 'wx' },
);
console.log('已生成随机开发密钥和 .env，管理员登录信息位于 .local/登录信息.md。');
console.log('下一步：docker compose -f compose.dev.yaml up -d --wait');
