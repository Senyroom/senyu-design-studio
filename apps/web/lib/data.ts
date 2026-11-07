import type { SiteData } from '../../../packages/contracts/types';
export const api = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
export async function getSite(): Promise<SiteData> {
  await connection();
  const r = await fetch(`${api}/api/v1/public/site`, {
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('内容服务暂不可用');
  const data = await r.json();
  if (!data.site) throw new Error('请先完成站点初始化并发布');
  return data;
}
import { connection } from 'next/server';
