import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/** Only published JSON goes here; MySQL owns the revision and remains authoritative. */
@Injectable()
export class PublicCache implements OnModuleInit, OnModuleDestroy {
  private client?: Redis;
  private hits = 0;
  private misses = 0;
  private failures = 0;
  private pending = new Map<string, Promise<unknown>>();
  onModuleInit() {
    if (!process.env.REDIS_URL) return;
    this.client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 800,
      commandTimeout: 800,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 300, 5000),
    });
    this.client.on('error', () => {
      /* Never log connection credentials. */
    });
    void this.client.connect().catch(() => {});
  }
  onModuleDestroy() {
    this.client?.disconnect();
  }
  status() {
    return {
      enabled: !!this.client,
      connected: this.client?.status === 'ready',
      hits: this.hits,
      misses: this.misses,
      failures: this.failures,
    };
  }
  async remember<T>(revision: number, resource: string, load: () => Promise<T>): Promise<T> {
    const key = `${process.env.REDIS_KEY_PREFIX || 'lsenyu:public'}:v${revision}:${resource}`;
    if (this.client?.status === 'ready') {
      try {
        const raw = await this.client.get(key);
        if (raw !== null) {
          const value = JSON.parse(raw);
          this.hits++;
          return value;
        }
      } catch {
        this.failures++;
      }
    }
    this.misses++;
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const task = (async () => {
      const value = await load();
      if (this.client?.status === 'ready') {
        try {
          await this.client.set(key, JSON.stringify(value), 'EX', 300);
        } catch {
          this.failures++;
        }
      }
      return value;
    })();
    this.pending.set(key, task);
    try {
      return await task;
    } finally {
      this.pending.delete(key);
    }
  }
}
