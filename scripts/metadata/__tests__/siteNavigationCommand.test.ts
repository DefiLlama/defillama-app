import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSiteNavigationCommand } from '../siteNavigationCommand'

const tempDirs: string[] = []

async function createRepoRoot(): Promise<string> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'site-navigation-command-test-'))
	tempDirs.push(repoRoot)
	await fs.mkdir(path.join(repoRoot, 'public'), { recursive: true })
	await fs.writeFile(
		path.join(repoRoot, 'public', 'pages.json'),
		JSON.stringify({
			Metrics: [
				{ route: '/revenue', name: 'Revenue' },
				{ route: '/fees', name: 'Fees' }
			],
			Protocols: [{ route: '/protocol/aave', name: 'Aave' }]
		})
	)
	return repoRoot
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('site navigation command', () => {
	it('writes pages and trending data from Tasty metrics', async () => {
		const repoRoot = await createRepoRoot()
		const now = 1_000

		await runSiteNavigationCommand({
			fetchMetrics: vi.fn().mockResolvedValue({
				tastyMetrics: { '/fees': 10, '/revenue': 1 },
				trendingRoutes: [['/fees', 10]]
			}),
			logger: { log: vi.fn() },
			now,
			repoRoot
		})

		const pages = JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'pages.json'), 'utf8'))
		expect(pages.Metrics.map((page: { route: string }) => page.route)).toEqual(['/fees', '/revenue'])
		expect(
			JSON.parse(await fs.readFile(path.join(repoRoot, '.cache', 'site-navigation', 'manifest.json'), 'utf8'))
		).toEqual({
			artifactVersion: 1,
			publishedAt: now
		})
		expect(JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'trending.json'), 'utf8'))).toEqual([
			{
				name: 'Fees',
				route: '/fees',
				category: 'Trending',
				description: ''
			}
		])
	})

	it('keeps site navigation publishing successful when Tasty metrics fail', async () => {
		const repoRoot = await createRepoRoot()

		await runSiteNavigationCommand({
			fetchMetrics: vi.fn().mockRejectedValue(new Error('metrics failed')),
			logger: { log: vi.fn() },
			now: 1_000,
			repoRoot
		})

		const pages = JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'pages.json'), 'utf8'))
		expect(pages.Metrics[0].tastyMetrics).toBeUndefined()
		await expect(fs.access(path.join(repoRoot, 'public', 'trending.json'))).rejects.toMatchObject({ code: 'ENOENT' })
		await expect(fs.access(path.join(repoRoot, '.cache', 'site-navigation', 'manifest.json'))).rejects.toMatchObject({
			code: 'ENOENT'
		})
	})

	it('skips recently published site navigation data', async () => {
		const repoRoot = await createRepoRoot()
		const fetchMetrics = vi.fn()
		const logger = { log: vi.fn() }
		await fs.mkdir(path.join(repoRoot, '.cache', 'site-navigation'), { recursive: true })
		await fs.writeFile(
			path.join(repoRoot, '.cache', 'site-navigation', 'manifest.json'),
			JSON.stringify({ artifactVersion: 1, publishedAt: 1_000 })
		)

		await runSiteNavigationCommand({
			fetchMetrics,
			logger,
			now: 1_000 + 60 * 60 * 1000,
			repoRoot
		})

		expect(fetchMetrics).not.toHaveBeenCalled()
		expect(logger.log).toHaveBeenCalledWith('[dev:prepare] Site navigation: recently published; skipping refresh')
	})

	it('retries within the ttl after publishing without Tasty metrics', async () => {
		const repoRoot = await createRepoRoot()
		const fetchMetrics = vi
			.fn()
			.mockRejectedValueOnce(new Error('metrics failed'))
			.mockResolvedValueOnce({
				tastyMetrics: { '/fees': 10 },
				trendingRoutes: [['/fees', 10]]
			})
		const logger = { log: vi.fn() }

		await runSiteNavigationCommand({
			fetchMetrics,
			logger,
			now: 1_000,
			repoRoot
		})
		await runSiteNavigationCommand({
			fetchMetrics,
			logger,
			now: 2_000,
			repoRoot
		})

		expect(fetchMetrics).toHaveBeenCalledTimes(2)
		expect(JSON.parse(await fs.readFile(path.join(repoRoot, 'public', 'trending.json'), 'utf8'))).toEqual([
			{
				name: 'Fees',
				route: '/fees',
				category: 'Trending',
				description: ''
			}
		])
	})
})
