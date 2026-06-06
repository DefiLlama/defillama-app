import fs from 'node:fs/promises'
import path from 'node:path'
import {
	buildPagesWithTastyMetrics,
	buildTrendingPages,
	loadDefillamaPages,
	writePagesAndTrendingIfNeeded
} from './pages'
import { fetchTastyMetrics, type TastyMetricsEnv, type TastyMetricsResult } from './tastyMetrics'

const SITE_NAVIGATION_MANIFEST_VERSION = 1
const SITE_NAVIGATION_MAX_AGE_MS = 60 * 60 * 1000

type SiteNavigationManifest = {
	artifactVersion: typeof SITE_NAVIGATION_MANIFEST_VERSION
	publishedAt: number
}

type SiteNavigationCommandOptions = {
	env?: NodeJS.ProcessEnv
	fetchMetrics?: (options: { endAt: number; env: TastyMetricsEnv; startAt: number }) => Promise<TastyMetricsResult>
	logger?: Pick<Console, 'log'>
	now?: number
	repoRoot?: string
}

function getSiteNavigationManifestPath(repoRoot: string): string {
	return path.join(repoRoot, '.cache', 'site-navigation', 'manifest.json')
}

async function hasSiteNavigationArtifacts(repoRoot: string): Promise<boolean> {
	try {
		await fs.access(path.join(repoRoot, 'public', 'pages.json'))
		return true
	} catch {
		return false
	}
}

async function readSiteNavigationManifest(repoRoot: string): Promise<SiteNavigationManifest | null> {
	try {
		const manifest = JSON.parse(
			await fs.readFile(getSiteNavigationManifestPath(repoRoot), 'utf8')
		) as Partial<SiteNavigationManifest>
		if (
			manifest.artifactVersion !== SITE_NAVIGATION_MANIFEST_VERSION ||
			typeof manifest.publishedAt !== 'number' ||
			!Number.isFinite(manifest.publishedAt)
		) {
			return null
		}
		return manifest as SiteNavigationManifest
	} catch {
		return null
	}
}

function isSiteNavigationFresh(manifest: SiteNavigationManifest | null, now: number): boolean {
	const age = manifest ? now - manifest.publishedAt : 0
	return manifest !== null && age >= 0 && age <= SITE_NAVIGATION_MAX_AGE_MS
}

async function writeSiteNavigationManifest(repoRoot: string, publishedAt: number): Promise<void> {
	const manifestPath = getSiteNavigationManifestPath(repoRoot)
	await fs.mkdir(path.dirname(manifestPath), { recursive: true })
	await fs.writeFile(
		manifestPath,
		JSON.stringify({ artifactVersion: SITE_NAVIGATION_MANIFEST_VERSION, publishedAt }, null, 2)
	)
}

export async function runSiteNavigationCommand({
	env = process.env,
	fetchMetrics = fetchTastyMetrics,
	logger = console,
	now = Date.now(),
	repoRoot = process.cwd()
}: SiteNavigationCommandOptions = {}): Promise<void> {
	const manifest = await readSiteNavigationManifest(repoRoot)
	if (isSiteNavigationFresh(manifest, now) && (await hasSiteNavigationArtifacts(repoRoot))) {
		logger.log('[dev:prepare] Site navigation: recently published; skipping refresh')
		return
	}

	const endAt = now
	const startAt = endAt - 1000 * 60 * 60 * 24 * 90
	let metricsRefreshSucceeded = true
	const metrics = await fetchMetrics({ endAt, env, startAt }).catch((error): TastyMetricsResult => {
		metricsRefreshSucceeded = false
		logger.log('Error fetching tasty metrics', error)
		return { tastyMetrics: {}, trendingRoutes: [] }
	})

	const defillamaPages = await loadDefillamaPages(repoRoot, logger)
	const finalDefillamaPages = buildPagesWithTastyMetrics(defillamaPages, metrics.tastyMetrics)
	const trendingPages = buildTrendingPages(defillamaPages, metrics.trendingRoutes)
	await writePagesAndTrendingIfNeeded(repoRoot, finalDefillamaPages, trendingPages)
	if (metricsRefreshSucceeded) {
		await writeSiteNavigationManifest(repoRoot, now)
	}
	logger.log('[dev:prepare] Site navigation: published pages and trending data')
}
