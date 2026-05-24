import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getMetadataCacheDir,
	getMetadataCacheMaxAgeMs,
	getMetadataCacheRetryMs,
	getMetadataFetchTimeoutMs,
	getMetadataRuntimeRefreshIntervalMs,
	getMetadataRuntimeRefreshJitterMs,
	shouldStartMetadataRuntimeRefreshLoop
} from '../config'

describe('metadata cache config', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('uses default cache config values', () => {
		expect(getMetadataCacheDir('/repo')).toBe(path.resolve('/repo', '.cache/app-metadata'))
		expect(getMetadataCacheMaxAgeMs()).toBe(60 * 60 * 1000)
		expect(getMetadataCacheRetryMs()).toBe(60 * 60 * 1000)
		expect(getMetadataRuntimeRefreshIntervalMs()).toBe(60 * 1000)
		expect(getMetadataRuntimeRefreshJitterMs()).toBe(5 * 60 * 1000)
		expect(getMetadataFetchTimeoutMs()).toBe(180_000)
	})

	it('disables the runtime refresh loop in tests and builds', () => {
		vi.stubEnv('NODE_ENV', 'production')
		expect(shouldStartMetadataRuntimeRefreshLoop()).toBe(true)

		vi.stubEnv('NODE_ENV', 'test')
		expect(shouldStartMetadataRuntimeRefreshLoop()).toBe(false)

		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('NEXT_PHASE', 'phase-production-build')
		expect(shouldStartMetadataRuntimeRefreshLoop()).toBe(false)
	})
})
