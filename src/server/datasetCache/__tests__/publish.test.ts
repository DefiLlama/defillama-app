import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { buildAllDatasetDomainsMock } = vi.hoisted(() => ({
	buildAllDatasetDomainsMock: vi.fn()
}))

vi.mock('../builders', () => ({
	buildAllDatasetDomains: buildAllDatasetDomainsMock
}))

describe('dataset cache publish', () => {
	let tempDir = ''

	afterEach(async () => {
		vi.unstubAllEnvs()
		vi.resetModules()
		buildAllDatasetDomainsMock.mockReset()
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

	it('uses strict dataset builds in production build mode', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		vi.stubEnv('NODE_ENV', 'production')
		const { buildEmptyDatasetManifest } = await import('../core')
		buildAllDatasetDomainsMock.mockResolvedValue(buildEmptyDatasetManifest(123))
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache()

		expect(buildAllDatasetDomainsMock).toHaveBeenCalledWith(`${rootDir}.tmp`, { logger: console, strict: true })
	})

	it('uses non-strict dataset builds in production refresh mode', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		vi.stubEnv('NODE_ENV', 'production')
		const { buildEmptyDatasetManifest } = await import('../core')
		buildAllDatasetDomainsMock.mockResolvedValue(buildEmptyDatasetManifest(123))
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache({ phase: 'refresh' })

		expect(buildAllDatasetDomainsMock).toHaveBeenCalledWith(`${rootDir}.tmp`, {
			strict: false,
			logger: console,
			failureLogPrefix: null
		})
	})

	it('keeps previous ready domain artifacts when a refresh domain fails', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		vi.stubEnv('NODE_ENV', 'production')
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const { buildEmptyDatasetManifest, writeDatasetManifest } = await import('../core')
		const currentManifest = buildEmptyDatasetManifest(111)
		await mkdir(path.join(rootDir, 'markets'), { recursive: true })
		await writeFile(path.join(rootDir, 'markets', 'tokens-list.json'), '{"version":"old"}')
		await writeFile(path.join(rootDir, 'markets', 'exchanges-list.json'), '{"version":"old"}')
		await writeDatasetManifest(currentManifest, rootDir)
		const refreshedManifest = buildEmptyDatasetManifest(222)
		refreshedManifest.domains.markets = { status: 'failed', builtAt: 0, error: 'markets unavailable' }
		buildAllDatasetDomainsMock.mockImplementation(async (buildDir: string) => {
			await mkdir(path.join(buildDir, 'markets'), { recursive: true })
			await writeFile(path.join(buildDir, 'markets', 'tokens-list.json'), '{"version":"failed-refresh"}')
			return refreshedManifest
		})
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache({ phase: 'refresh' })

		const manifest = JSON.parse(await readFile(path.join(rootDir, 'manifest.json'), 'utf8'))
		expect(manifest.domains.markets).toEqual({ status: 'ready', builtAt: 111 })
		await expect(readFile(path.join(rootDir, 'markets', 'tokens-list.json'), 'utf8')).resolves.toBe('{"version":"old"}')
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('markets: markets unavailable (kept previous artifacts)')
		)
		error.mockRestore()
	})

	it('skips rebuilds when the existing manifest is recent', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		const { buildEmptyDatasetManifest, writeDatasetManifest } = await import('../core')
		await writeDatasetManifest(buildEmptyDatasetManifest(Date.now()), rootDir)
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache()

		expect(buildAllDatasetDomainsMock).not.toHaveBeenCalled()
		await expect(stat(`${rootDir}.tmp`)).rejects.toThrow()
	})

	it('rebuilds when the existing manifest has failed domains', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		const { buildEmptyDatasetManifest, writeDatasetManifest } = await import('../core')
		const manifest = buildEmptyDatasetManifest(Date.now())
		manifest.domains.markets = { status: 'failed', builtAt: 0, error: 'markets unavailable' }
		await writeDatasetManifest(manifest, rootDir)
		buildAllDatasetDomainsMock.mockResolvedValue(buildEmptyDatasetManifest(Date.now()))
		const { publishDatasetCache } = await import('../publish')

		await publishDatasetCache()

		expect(buildAllDatasetDomainsMock).toHaveBeenCalledWith(`${rootDir}.tmp`, { logger: console, strict: false })
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

	it('logs refresh publish failures before keeping the previous cache', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		vi.stubEnv('NODE_ENV', 'production')
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		buildAllDatasetDomainsMock.mockRejectedValue(new Error('refresh failed'))
		const { publishDatasetCache } = await import('../publish')

		await expect(publishDatasetCache({ phase: 'refresh' })).rejects.toThrow('refresh failed')

		expect(error).toHaveBeenCalledWith('[dataset-cache:refresh] failed; keeping previous cache:', expect.any(Error))
		error.mockRestore()
	})

	it('recovers a backup before building datasets', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-publish-'))
		const rootDir = path.join(tempDir, 'datasets')
		const backupDir = `${rootDir}.bak`
		vi.stubEnv('DATASET_CACHE_DIR', rootDir)
		buildAllDatasetDomainsMock.mockRejectedValue(new Error('build failed'))
		await mkdir(backupDir, { recursive: true })
		await writeFile(path.join(backupDir, 'marker.txt'), 'restored')
		const { publishDatasetCache } = await import('../publish')

		await expect(publishDatasetCache()).rejects.toThrow('build failed')

		await expect(readFile(path.join(rootDir, 'marker.txt'), 'utf8')).resolves.toBe('restored')
	})
})
