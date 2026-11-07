import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidate-secret') || '',
    expected = process.env.REVALIDATE_SECRET || '';
  if (
    !expected ||
    Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  )
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  revalidateTag('site', { expire: 0 });
  revalidatePath('/', 'layout');
  return Response.json({ ok: true });
}
