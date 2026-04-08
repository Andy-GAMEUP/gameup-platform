/**
 * TTL 기반 인메모리 Map 캐시
 * pointService, gamePointService 등에서 공통으로 사용
 */
export class SimpleCache<T> {
  private cache = new Map<string, T>()
  private lastRefresh = 0

  constructor(private ttlMs: number) {}

  isExpired(): boolean {
    return this.cache.size === 0 || Date.now() - this.lastRefresh >= this.ttlMs
  }

  get(key: string): T | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: T): void {
    this.cache.set(key, value)
  }

  markRefreshed(): void {
    this.lastRefresh = Date.now()
  }

  invalidate(): void {
    this.lastRefresh = 0
    this.cache = new Map()
  }
}
