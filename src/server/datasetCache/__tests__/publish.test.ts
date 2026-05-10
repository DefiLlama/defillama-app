import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { buildAllDatasetDomainsMock, refreshMetadataIfStaleMock } = vi.hoisted(() => ({
	buildAllDatasetDomainsMock: vi.fn(),
	refreshMetadataIfStaleMock: vi.fn()
}))

vi.mock('../builders', () => ({
	buildAllDatasetDomains: buildAllDatasetDomainsMock
}))

vi.mock('~/utils/metadata', () => ({
	refreshMetadataIfStale: refreshMetadataIfStaleMock
}))

describe('dataset cache publish', () => {
	let tempDir = ''

	afterEach(async () => {
		vi.unstubAllEnvs()
		vi.resetModules()
		buildAllDatasetDomainsMock.mockReset()
		refreshMetadataIfStaleMock.mockReset()
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true })
			tempDir = ''
		}
	})

	it('builds into a temp directory and promotes a readable manifest', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		const { buildEmptyDatasetManifest } = await import('../core')
		buildAllDatasetDomainsMock.mockResolvedValue(buildEmptyDatasetManifest(123))
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache()

		const manifest = JSON.parse(await readFile(path.join(rootDir, 'manifest.json'), 'utf8'))
		expect(manifest.artifactVersion).toBe(2)
		expect(manifest.domains.yields).toEqual({ status: 'ready', builtAt: 123 })
		await expect(stat(`${rootDir}.tmp`)).rejects.toThrow()
	})

	it('removes the temp directory when the build fails', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		buildAllDatasetDomainsMock.mockRejectedValue(new Error('build failed'))
		const { publishDatasetCache } = await import('../publish')

		await expect(publishDatasetCache()).rejects.toThrow('build failed')
		await expect(stat(`${rootDir}.tmp`)).rejects.toThrow()
	})
})
