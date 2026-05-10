import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getDatasetCacheFetchTimeoutMs,
	getDatasetCacheMaxAgeMs,
	getDatasetCacheRootDir,
	isDatasetCacheEnabled,
	isDatasetCacheStrict,
	shouldForceDatasetCacheRefresh
} from '../config'

describe('dataset cache config', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('resolves the dataset cache root from one env surface', () => {
		expect(getDatasetCacheRootDir()).toBe(path.resolve(process.cwd(), '.cache/datasets'))

		vi.stubEnv('DATASET_CACHE_DIR', '.cache/custom-datasets')

		expect(getDatasetCacheRootDir()).toBe(path.resolve(process.cwd(), '.cache/custom-datasets'))
	})

	it('centralizes dataset cache policy env flags', () => {
		vi.stubEnv('NODE_ENV', 'development')

		expect(isDatasetCacheEnabled()).toBe(true)
		expect(isDatasetCacheStrict()).toBe(false)
		expect(shouldForceDatasetCacheRefresh()).toBe(false)

		vi.stubEnv('DATASET_CACHE_DISABLE', '1')
		vi.stubEnv('DATASET_CACHE_STRICT', '1')
		vi.stubEnv('DATASET_CACHE_FORCE_REFRESH', '1')

		expect(isDatasetCacheEnabled()).toBe(false)
		expect(isDatasetCacheStrict()).toBe(true)
		expect(shouldForceDatasetCacheRefresh()).toBe(true)
	})

	it('centralizes dataset cache numeric env values', () => {
		expect(getDatasetCacheMaxAgeMs()).toBe(300_000)
		expect(getDatasetCacheFetchTimeoutMs()).toBe(180_000)

		vi.stubEnv('DATASET_CACHE_MAX_AGE_MS', '120')
		vi.stubEnv('DATASET_CACHE_FETCH_TIMEOUT_MS', '240')

		expect(getDatasetCacheMaxAgeMs()).toBe(120)
		expect(getDatasetCacheFetchTimeoutMs()).toBe(240)
	})
})
