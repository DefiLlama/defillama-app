import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DefillamaPages } from '../../metadata/pages'
import {
	buildGeneratedCatalogSections,
	buildLlmsFullTxt,
	buildLlmsTxt,
	generateLlmsArtifacts,
	normalizeSiteUrl
} from '../llms'

const tempDirs: string[] = []

const samplePages: DefillamaPages = {
	Metrics: [
		{
			name: 'Fees',
			route: '/fees',
			category: 'Fees & Revenue',
			description: 'Total fees paid by users when using protocols.'
		},
		{
			name: 'External Metrics',
			route: 'https://example.com/metrics',
			category: 'External',
			description: 'External metrics page.'
		}
	],
	Tools: [
		{
			name: 'Compare Chains',
			route: '/compare-chains?chains=Ethereum&chains=Base',
			category: 'Tools',
			description: 'Compare metrics across chains.'
		},
		{
			name: 'Sheets Auth',
			route: '/sheets/auth',
			category: 'Tools',
			description: 'Auth-only route.'
		}
	],
	Main: [
		{
			name: 'Home',
			route: '/',
			description: 'Main DefiLlama dashboard.'
		}
	],
	Premium: [
		{
			name: 'Custom Dashboards',
			route: '/pro',
			description: 'Custom no-code dashboards.'
		}
	],
	More: [
		{
			name: 'Research Admin',
			route: '/research/admin',
			description: 'Private research admin route.'
		},
		{
			name: 'Data Definitions',
			route: '/data-definitions',
			description: 'Canonical metric definitions.'
		}
	],
	'About Us': [
		{
			name: 'About / Contact',
			route: '/about',
			description: 'About DefiLlama.'
		}
	],
	Hidden: [
		{
			name: 'Hidden Subscription',
			route: '/subscription',
			description: 'Hidden duplicate route.'
		}
	]
}

async function createRepoRoot(pages?: DefillamaPages): Promise<string> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'llms-command-test-'))
	tempDirs.push(repoRoot)
	await fs.mkdir(path.join(repoRoot, 'public'), { recursive: true })
	if (pages) {
		await fs.writeFile(path.join(repoRoot, 'public', 'pages.json'), JSON.stringify(pages, null, 2))
	}
	return repoRoot
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('llms artifact generation', () => {
	it('writes llms.txt and llms-full.txt under public', async () => {
		const repoRoot = await createRepoRoot(samplePages)
		const logger = { log: vi.fn() }

		await generateLlmsArtifacts({
			env: { NEXT_PUBLIC_SITE_URL: 'https://example.com/', NODE_ENV: 'test' },
			logger,
			repoRoot
		})

		const llms = await fs.readFile(path.join(repoRoot, 'public', 'llms.txt'), 'utf8')
		const full = await fs.readFile(path.join(repoRoot, 'public', 'llms-full.txt'), 'utf8')

		expect(llms).toContain('# DefiLlama')
		expect(llms).toContain('[Full LLM context](https://example.com/llms-full.txt)')
		expect(full).toContain('# DefiLlama full LLM context')
		expect(full).toContain('## Dashboard catalog - Metrics')
		expect(full).toContain('[Fees](https://example.com/fees)')
		expect(logger.log).toHaveBeenCalledWith(
			'[dev:prepare] llms.txt: generated public/llms.txt and public/llms-full.txt'
		)
	})

	it('normalizes site URLs with trailing slashes', () => {
		expect(normalizeSiteUrl('https://defillama.com/')).toBe('https://defillama.com')
		expect(normalizeSiteUrl('https://defillama.com///')).toBe('https://defillama.com')
		expect(normalizeSiteUrl(undefined)).toBe('https://defillama.com')
	})

	it('excludes hidden, external, and private routes from the generated dashboard catalog', () => {
		const full = buildLlmsFullTxt({ pages: samplePages, siteUrl: 'https://defillama.com' })
		const catalogSections = buildGeneratedCatalogSections(samplePages)

		expect(catalogSections.map((section) => section.title)).toEqual([
			'Dashboard catalog - Metrics',
			'Dashboard catalog - Tools',
			'Dashboard catalog - Main',
			'Dashboard catalog - Premium',
			'Dashboard catalog - More',
			'Dashboard catalog - About Us'
		])
		expect(full).toContain('[Compare Chains](https://defillama.com/compare-chains?chains=Ethereum&chains=Base)')
		expect(full).not.toContain('External Metrics')
		expect(full).not.toContain('Sheets Auth')
		expect(full).not.toContain('Research Admin')
		expect(full).not.toContain('Hidden Subscription')
	})

	it('renders deterministic short and full files', () => {
		const firstShort = buildLlmsTxt({ pages: samplePages, siteUrl: 'https://defillama.com' })
		const secondShort = buildLlmsTxt({ pages: samplePages, siteUrl: 'https://defillama.com' })
		const firstFull = buildLlmsFullTxt({ pages: samplePages, siteUrl: 'https://defillama.com' })
		const secondFull = buildLlmsFullTxt({ pages: samplePages, siteUrl: 'https://defillama.com' })

		expect(firstShort).toBe(secondShort)
		expect(firstFull).toBe(secondFull)
	})

	it('falls back when pages.json is missing', async () => {
		const repoRoot = await createRepoRoot()

		await generateLlmsArtifacts({ logger: { log: vi.fn() }, repoRoot })

		await expect(fs.stat(path.join(repoRoot, 'public', 'llms.txt'))).resolves.toBeTruthy()
		await expect(fs.stat(path.join(repoRoot, 'public', 'llms-full.txt'))).resolves.toBeTruthy()
	})
})
