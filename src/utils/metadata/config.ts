import path from 'node:path'

const DEFAULT_METADATA_CACHE_DIR = '.cache/app-metadata'
const DEFAULT_METADATA_CACHE_MAX_AGE_MS = 60 * 60 * 1000
const DEFAULT_METADATA_CACHE_RETRY_MS = 60 * 60 * 1000
const DEFAULT_METADATA_RUNTIME_REFRESH_INTERVAL_MS = 60 * 1000
const DEFAULT_METADATA_RUNTIME_REFRESH_JITTER_MS = 5 * 60 * 1000
const DEFAULT_METADATA_FETCH_TIMEOUT_MS = 180_000

export function getMetadataCacheDir(repoRoot = process.cwd()): string {
	return path.resolve(repoRoot, DEFAULT_METADATA_CACHE_DIR)
}

export function getMetadataCacheMaxAgeMs(): number {
	return DEFAULT_METADATA_CACHE_MAX_AGE_MS
}

export function getMetadataCacheRetryMs(): number {
	return DEFAULT_METADATA_CACHE_RETRY_MS
}

export function getMetadataRuntimeRefreshIntervalMs(): number {
	return DEFAULT_METADATA_RUNTIME_REFRESH_INTERVAL_MS
}

export function getMetadataRuntimeRefreshJitterMs(): number {
	return DEFAULT_METADATA_RUNTIME_REFRESH_JITTER_MS
}

export function getMetadataFetchTimeoutMs(): number {
	return DEFAULT_METADATA_FETCH_TIMEOUT_MS
}

export function shouldStartMetadataRuntimeRefreshLoop(env = process.env): boolean {
	return env.NODE_ENV !== 'test' && env.NEXT_PHASE !== 'phase-production-build' && env.npm_lifecycle_event !== 'build'
}
