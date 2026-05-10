import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	DATASET_DOMAINS,
	DatasetDomainUnavailableError,
	buildEmptyDatasetManifest,
	readDatasetDomainJson,
	readDatasetManifestFrom,
	readJsonFile,
	readJsonFileOnce,
	writeDatasetManifest,
	writeJsonFile,
	writeJsonFileAtomically
} from '../core'

describe('dataset cache JSON reader', () => {
	let tempDir = ''

	afterEach(async () => {
		vi.unstubAllEnvs()
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true })
			tempDir = ''
		}
	})

	it('reads raw JSON from disk without using the stale-while-refresh cache', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		const filePath = path.join(tempDir, 'payload.json')

		await writeJsonFileAtomically(filePath, { version: 1 })
		await expect(readJsonFileOnce(filePath)).resolves.toEqual({ version: 1 })

		await writeFile(filePath, JSON.stringify({ version: 2 }))

		await expect(readJsonFileOnce(filePath)).resolves.toEqual({ version: 2 })
	})

	it('returns cached JSON immediately and refreshes changed files in the background', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		const filePath = path.join(tempDir, 'payload.json')

		await writeJsonFile(filePath, { version: 1 })

		await expect(readJsonFile(filePath)).resolves.toEqual({ version: 1 })

		await writeFile(filePath, JSON.stringify({ version: 2 }))

		await expect(readJsonFile(filePath)).resolves.toEqual({ version: 1 })
		await vi.waitFor(async () => {
			await expect(readJsonFile(filePath)).resolves.toEqual({ version: 2 })
		})
	})

	it('invalidates the cached JSON after repository writes', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		const filePath = path.join(tempDir, 'payload.json')

		await writeJsonFile(filePath, { version: 1 })
		await expect(readJsonFile(filePath)).resolves.toEqual({ version: 1 })

		await writeJsonFile(filePath, { version: 2 })

		await expect(readJsonFile(filePath)).resolves.toEqual({ version: 2 })
	})

	it('rejects invalid dataset manifest versions', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		await writeJsonFile(path.join(tempDir, 'manifest.json'), {
			artifactVersion: 1,
			builtAt: Date.now(),
			domains: {}
		})

		await expect(readDatasetManifestFrom(tempDir)).rejects.toThrow('expected 2, got 1')
	})

	it('reports failed domains before reading domain files', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		vi.stubEnv('DATASET_CACHE_DIR', tempDir)
		const manifest = buildEmptyDatasetManifest()
		manifest.domains.yields = { status: 'failed', builtAt: 0, error: 'upstream timeout' }
		await writeDatasetManifest(manifest, tempDir)

		await expect(readDatasetDomainJson('yields', 'rows.json')).rejects.toEqual(
			new DatasetDomainUnavailableError('yields', 'upstream timeout')
		)
		vi.unstubAllEnvs()
	})

	it('reads domain JSON when the manifest marks the domain ready', async () => {
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'dataset-cache-core-'))
		vi.stubEnv('DATASET_CACHE_DIR', tempDir)
		await writeDatasetManifest(buildEmptyDatasetManifest(), tempDir)
		await writeJsonFile(path.join(tempDir, 'yields', 'rows.json'), [{ pool: 'a' }])

		await expect(readDatasetDomainJson('yields', 'rows.json')).resolves.toEqual([{ pool: 'a' }])
		vi.unstubAllEnvs()
	})

	it('writes ready status for all empty manifest domains', () => {
		const manifest = buildEmptyDatasetManifest(123)

		for (const domain of DATASET_DOMAINS) {
			expect(manifest.domains[domain]).toEqual({ status: 'ready', builtAt: 123 })
		}
	})
})
