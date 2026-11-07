import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const dir = path.resolve(import.meta.dirname, '../.local');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'production.env');
if (fs.existsSync(file)) throw new Error('生产配置已存在，未覆盖。请编辑 .local/production.env');
fs.writeFileSync(
  file,
  `MYSQL_PASSWORD=${randomBytes(24).toString('hex')}\nMYSQL_ROOT_PASSWORD=${randomBytes(24).toString('hex')}\nREVALIDATE_SECRET=${randomBytes(32).toString('hex')}\nADMIN_USERNAME=admin\nADMIN_PASSWORD=${randomBytes(18).toString('base64url')}\nSITE_URL=http://localhost:8080\nCOOKIE_SECURE=false\n`,
  { mode: 0o600, flag: 'wx' },
);
console.log(
  '已生成 .local/production.env；填写正式域名，启用 HTTPS 后将 COOKIE_SECURE 改为 true。',
);
