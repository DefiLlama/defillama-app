import { describe, expect, it } from 'vitest'
import { isLocalDevWithoutApiKey, shouldSkipMetadataRefresh, shouldWriteMetadataStubsOnFailure } from '../policy'

describe('metadata stub policy', () => {
	it('detects local development without an API key', () => {
		expect(isLocalDevWithoutApiKey({ NODE_ENV: 'development', API_KEY: '' })).toBe(true)
		expect(isLocalDevWithoutApiKey({ NODE_ENV: 'development', API_KEY: 'key' })).toBe(false)
		expect(isLocalDevWithoutApiKey({ NODE_ENV: 'production', API_KEY: '' })).toBe(false)
	})

	it('uses the same local-dev no-key condition for runtime refresh skips', () => {
		expect(shouldSkipMetadataRefresh({ NODE_ENV: 'development', API_KEY: '' })).toBe(true)
		expect(shouldSkipMetadataRefresh({ NODE_ENV: 'development', API_KEY: 'key' })).toBe(false)
		expect(shouldSkipMetadataRefresh({ NODE_ENV: 'production', API_KEY: '' })).toBe(false)
	})

	it('allows stub writes only in CI or development', () => {
		expect(shouldWriteMetadataStubsOnFailure({ CI: 'true', NODE_ENV: 'production' })).toBe(true)
		expect(shouldWriteMetadataStubsOnFailure({ NODE_ENV: 'development' })).toBe(true)
		expect(shouldWriteMetadataStubsOnFailure({ NODE_ENV: 'production' })).toBe(false)
	})
})
