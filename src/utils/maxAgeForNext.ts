//:00 -> adapters start running, they take up to 15mins
//:20 -> storeProtocols starts running, sets cache expiry to :21 of next hour
//:22 -> we rebuild all pages
const DEFAULT_CACHE_JITTER_SECONDS = 1200
const MIN_JITTERED_CACHE_SECONDS = 60
const CACHE_JITTER_META = Symbol.for('defillama.cacheJitterMeta')

export type CacheJitterMeta = {
	cache_jitter_seconds: number
}

function envNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

function cacheJitterWindowSeconds(): number {
	return Math.max(0, Math.floor(envNumber('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', DEFAULT_CACHE_JITTER_SECONDS)))
}

function buildIdSegment(): string {
	return (
		process.env.NEXT_BUILD_ID ??
		process.env.VERCEL_GIT_COMMIT_SHA ??
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
		process.env.BUILD_ID ??
		process.env.VERCEL_DEPLOYMENT_ID ??
		''
	)
}

function hashString(value: string): number {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

export function cacheJitterOffsetSeconds(key: string, jitterWindowSeconds = cacheJitterWindowSeconds()): number {
	const windowSeconds = Math.floor(jitterWindowSeconds)
	if (windowSeconds <= 0 || !key) return 0
	const bucketCount = windowSeconds + 1
	const bucket = hashString(`${buildIdSegment()}:${key}`) % bucketCount
	return bucket - Math.floor(windowSeconds / 2)
}

export function jitterCacheSeconds(baseSeconds: number, key: string): { seconds: number; offsetSeconds: number } {
	const jitterWindowSeconds = cacheJitterWindowSeconds()
	if (jitterWindowSeconds <= 0) {
		return { seconds: Math.floor(baseSeconds), offsetSeconds: 0 }
	}
	const offsetSeconds = cacheJitterOffsetSeconds(key, jitterWindowSeconds)
	return {
		seconds: Math.max(MIN_JITTERED_CACHE_SECONDS, Math.floor(baseSeconds + offsetSeconds)),
		offsetSeconds
	}
}

export function jitterCacheControlHeader(cacheControl: string, key: string): string {
	if (!cacheControl.includes('s-maxage=')) return cacheControl
	return cacheControl.replace(/s-maxage=(\d+)/, (_match, seconds: string) => {
		const jittered = jitterCacheSeconds(Number(seconds), key)
		return `s-maxage=${jittered.seconds}`
	})
}

export function attachCacheJitterMeta<T extends object>(target: T, meta: CacheJitterMeta): T {
	Object.defineProperty(target, CACHE_JITTER_META, {
		value: meta,
		enumerable: false,
		configurable: true
	})
	return target
}

export function readCacheJitterMeta(value: unknown): CacheJitterMeta | undefined {
	return typeof value === 'object' && value !== null
		? ((value as { [CACHE_JITTER_META]?: CacheJitterMeta })[CACHE_JITTER_META] ?? undefined)
		: undefined
}

export function maxAgeForNext(minutesForRollover: number[] = [22]) {
	// minutesForRollover is an array of minutes in the hour that we want to revalidate
	const now = new Date()
	const currentMinute = now.getMinutes()
	const currentSecond = now.getSeconds()
	const nextMinute = minutesForRollover.find((m) => m > currentMinute) ?? Math.min(...minutesForRollover) + 60
	const maxAge = nextMinute * 60 - currentMinute * 60 - currentSecond
	return maxAge
}

export function jitteredMaxAgeForNext(minutesForRollover: number[] = [22], key: string): number {
	return jitterCacheSeconds(maxAgeForNext(minutesForRollover), key).seconds
}
