import path from 'node:path'

const DEFAULT_DATASET_CACHE_ROOT_DIR = '.cache/datasets'
const DEFAULT_DATASET_CACHE_MAX_AGE_MS = 5 * 60 * 1000
const DEFAULT_DATASET_CACHE_FETCH_TIMEOUT_MS = 180_000

function getEnvNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw == null) return fallback

	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function getDatasetCacheRootDir(): string {
	return path.resolve(process.cwd(), process.env.DATASET_CACHE_DIR ?? DEFAULT_DATASET_CACHE_ROOT_DIR)
}

export function isDatasetCacheEnabled(): boolean {
	return process.env.NODE_ENV !== 'test' && process.env.DATASET_CACHE_DISABLE !== '1'
}

export function isDatasetCacheStrict(): boolean {
	return process.env.DATASET_CACHE_STRICT === '1'
}

export function shouldForceDatasetCacheRefresh(): boolean {
	return process.env.DATASET_CACHE_FORCE_REFRESH === '1'
}

export function getDatasetCacheMaxAgeMs(): number {
	return getEnvNumber('DATASET_CACHE_MAX_AGE_MS', DEFAULT_DATASET_CACHE_MAX_AGE_MS)
}

export function getDatasetCacheFetchTimeoutMs(): number {
	return getEnvNumber('DATASET_CACHE_FETCH_TIMEOUT_MS', DEFAULT_DATASET_CACHE_FETCH_TIMEOUT_MS)
}
