import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export interface CacheEntry {
  result: any;
  timestamp: number;
  model: string;
}

@Injectable()
export class AICacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AICacheService.name);
  private redis?: Redis;
  private memoryCache = new Map<string, CacheEntry>();
  private readonly TTL_SECONDS: number;
  private readonly MAX_MEMORY_ENTRIES = 1000;
  private readonly CACHE_PREFIX = 'verimed:ai:';

  constructor(private config: ConfigService) {
    this.TTL_SECONDS = 24 * 60 * 60; // 24 hours

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.initRedis(redisUrl);
    } else {
      this.logger.warn(
        'REDIS_URL not configured. Using in-memory cache (not recommended for production).',
      );
    }
  }

  private initRedis(url: string): void {
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error(
              'Redis connection failed after 3 retries. Falling back to memory cache.',
            );
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });

      this.redis.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.redis.connect().catch((err) => {
        this.logger.error(`Redis connection failed: ${err.message}`);
        this.redis = undefined;
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error}`);
      this.redis = undefined;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Generate a unique hash for a document buffer
   */
  generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get cached result if available
   */
  async get(documentHash: string): Promise<CacheEntry | null> {
    const key = `${this.CACHE_PREFIX}${documentHash}`;

    // Try Redis first
    if (this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          this.logger.log(
            `[Redis Cache HIT] ${documentHash.substring(0, 12)}...`,
          );
          return JSON.parse(data) as CacheEntry;
        }
        this.logger.debug(
          `[Redis Cache MISS] ${documentHash.substring(0, 12)}...`,
        );
        return null;
      } catch (error) {
        this.logger.warn(`Redis get failed, falling back to memory: ${error}`);
      }
    }

    // Fall back to memory cache
    const entry = this.memoryCache.get(documentHash);
    if (!entry) {
      this.logger.debug(
        `[Memory Cache MISS] ${documentHash.substring(0, 12)}...`,
      );
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.TTL_SECONDS * 1000) {
      this.memoryCache.delete(documentHash);
      this.logger.debug(
        `[Memory Cache EXPIRED] ${documentHash.substring(0, 12)}...`,
      );
      return null;
    }

    this.logger.log(`[Memory Cache HIT] ${documentHash.substring(0, 12)}...`);
    return entry;
  }

  /**
   * Store a result in the cache
   */
  async set(documentHash: string, result: any, model: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${documentHash}`;
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      model,
    };

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(entry));
        this.logger.debug(
          `[Redis Cache SET] ${documentHash.substring(0, 12)}...`,
        );
        return;
      } catch (error) {
        this.logger.warn(`Redis set failed, falling back to memory: ${error}`);
      }
    }

    // Fall back to memory cache
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.logger.debug(
          `[Memory Cache EVICT] ${oldestKey.substring(0, 12)}...`,
        );
      }
    }

    this.memoryCache.set(documentHash, entry);
    this.logger.debug(`[Memory Cache SET] ${documentHash.substring(0, 12)}...`);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        this.logger.log(`[Redis Cache CLEARED] Removed ${keys.length} entries`);
      } catch (error) {
        this.logger.warn(`Redis clear failed: ${error}`);
      }
    }

    const count = this.memoryCache.size;
    this.memoryCache.clear();
    this.logger.log(`[Memory Cache CLEARED] Removed ${count} entries`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    size: number;
    maxSize: number | 'unlimited';
    ttlSeconds: number;
  }> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
        return {
          type: 'redis',
          size: keys.length,
          maxSize: 'unlimited',
          ttlSeconds: this.TTL_SECONDS,
        };
      } catch (error) {
        this.logger.warn(`Redis stats failed: ${error}`);
      }
    }

    return {
      type: 'memory',
      size: this.memoryCache.size,
      maxSize: this.MAX_MEMORY_ENTRIES,
      ttlSeconds: this.TTL_SECONDS,
    };
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redis?.status === 'ready';
  }
}
