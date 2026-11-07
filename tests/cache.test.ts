import 'reflect-metadata';
import { config } from 'dotenv';
config({ quiet: true });
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { PublicCache } from '../apps/api/src/cache';

test('Redis：旧请求晚写、断线发布及恢复后均使用内容版本隔离', async () => {
  assert.ok(process.env.REDIS_URL, '缓存测试需要真实 Redis');
  const prefix = `lsenyu:qa:${randomBytes(10).toString('hex')}`;
  process.env.REDIS_KEY_PREFIX = prefix;
  const redis = new Redis(process.env.REDIS_URL!);
  const cache = new PublicCache();
  const recovered = new PublicCache();
  const ready = async (instance: PublicCache) => {
    instance.onModuleInit();
    for (let i = 0; i < 50 && !instance.status().connected; i++)
      await new Promise((r) => setTimeout(r, 20));
    assert.equal(instance.status().connected, true);
  };
  try {
    await ready(cache);
    let finishOld!: (value: object) => void;
    let oldStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      oldStarted = resolve;
    });
    const old = cache.remember(1, 'site', () => {
      oldStarted();
      return new Promise<object>((resolve) => {
        finishOld = resolve;
      });
    });
    await started;
    assert.deepEqual(await cache.remember(2, 'site', async () => ({ tags: ['新版本'] })), {
      tags: ['新版本'],
    });
    finishOld({ tags: ['旧版本'] });
    await old;
    assert.deepEqual(await cache.remember(2, 'site', async () => assert.fail('应该命中')), {
      tags: ['新版本'],
    });
    cache.onModuleDestroy();
    assert.deepEqual(await cache.remember(3, 'site', async () => ({ tags: ['断线时发布'] })), {
      tags: ['断线时发布'],
    });
    await ready(recovered);
    assert.deepEqual(await recovered.remember(3, 'site', async () => ({ tags: ['断线时发布'] })), {
      tags: ['断线时发布'],
    });
    assert.deepEqual(await recovered.remember(3, 'site', async () => assert.fail('应该命中')), {
      tags: ['断线时发布'],
    });
    assert.ok((await redis.ttl(`${prefix}:v3:site`)) > 0);
  } finally {
    cache.onModuleDestroy();
    recovered.onModuleDestroy();
    // Only the random keys created by this test, never FLUSHDB or other sites' keys.
    await redis.del(...[1, 2, 3].map((v) => `${prefix}:v${v}:site`));
    redis.disconnect();
  }
});
