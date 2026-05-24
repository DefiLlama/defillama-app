import {
	buildPagesWithTastyMetrics,
	buildTrendingPages,
	loadDefillamaPages,
	writePagesAndTrendingIfNeeded
} from './pages'
import { fetchTastyMetrics, type TastyMetricsEnv, type TastyMetricsResult } from './tastyMetrics'

type SiteNavigationCommandOptions = {
	env?: NodeJS.ProcessEnv
	fetchMetrics?: (options: { endAt: number; env: TastyMetricsEnv; startAt: number }) => Promise<TastyMetricsResult>
	logger?: Pick<Console, 'log'>
	now?: number
	repoRoot?: string
}

export async function runSiteNavigationCommand({
	env = process.env,
	fetchMetrics = fetchTastyMetrics,
	logger = console,
	now = Date.now(),
	repoRoot = process.cwd()
}: SiteNavigationCommandOptions = {}): Promise<void> {
	const endAt = now
	const startAt = endAt - 1000 * 60 * 60 * 24 * 90
	const metrics = await fetchMetrics({ endAt, env, startAt }).catch((error): TastyMetricsResult => {
		logger.log('Error fetching tasty metrics', error)
		return { tastyMetrics: {}, trendingRoutes: [] }
	})

	const defillamaPages = await loadDefillamaPages(repoRoot, logger)
	const finalDefillamaPages = buildPagesWithTastyMetrics(defillamaPages, metrics.tastyMetrics)
	const trendingPages = buildTrendingPages(defillamaPages, metrics.trendingRoutes)
	await writePagesAndTrendingIfNeeded(repoRoot, finalDefillamaPages, trendingPages)
	logger.log('[dev:prepare] Site navigation: published pages and trending data')
}
