import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildTrendingPages, writePagesAndTrendingIfNeeded, type DefillamaPages } from '../pages'

const tempDirs: string[] = []

async function createRepoRoot(): Promise<string> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-pages-test-'))
	tempDirs.push(repoRoot)
	await fs.mkdir(path.join(repoRoot, 'public'), { recursive: true })
	return repoRoot
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('metadata page helpers', () => {
	it('writes pages even when there are no trending pages', async () => {
		const repoRoot = await createRepoRoot()
		const pages: DefillamaPages = {
			Metrics: [{ route: '/fees', name: 'Fees' }]
		}

		await writePagesAndTrendingIfNeeded(repoRoot, pages, [])

		expect(JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'pages.json'), 'utf8'))).toEqual(pages)
		await expect(fs.stat(path.join(repoRoot, 'public', 'trending.json'))).rejects.toThrow()
	})

	it('does not filter protocol routes as pro routes', () => {
		const trendingPages = buildTrendingPages({}, [
			['/protocols/aave', 10],
			['/pro', 9],
			['/pro/features', 8]
		])

		expect(trendingPages).toEqual([
			{
				name: 'Protocols: Aave',
				route: '/protocols/aave',
				category: 'Trending',
				description: ''
			}
		])
	})
})
