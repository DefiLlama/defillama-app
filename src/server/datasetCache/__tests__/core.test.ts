import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readJsonFile, readJsonFileOnce, writeJsonFile, writeJsonFileAtomically } from '../core'

describe('dataset cache JSON reader', () => {
	let tempDir = ''

	afterEach(async () => {
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
})
