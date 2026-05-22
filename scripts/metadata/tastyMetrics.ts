export type TastyMetricsResult = {
	tastyMetrics: Record<string, number>
	trendingRoutes: Array<[string, number]>
}

export type TastyMetricsEnv = {
	[key: string]: string | undefined
	TASTY_API_KEY?: string
	TASTY_API_URL?: string
}

type FetchTastyMetricsOptions = {
	endAt: number
	env?: TastyMetricsEnv
	fetchFn?: typeof fetch
	logger?: Pick<Console, 'log'>
	startAt: number
}

const TASTY_METRICS_TIMEOUT_MS = 15_000

const emptyTastyMetrics = (): TastyMetricsResult => ({
	tastyMetrics: {},
	trendingRoutes: []
})

export async function fetchTastyMetrics({
	endAt,
	env = process.env,
	fetchFn = fetch,
	logger = console,
	startAt
}: FetchTastyMetricsOptions): Promise<TastyMetricsResult> {
	if (!env.TASTY_API_URL) {
		return emptyTastyMetrics()
	}

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), TASTY_METRICS_TIMEOUT_MS)
		const response = await fetchFn(`${env.TASTY_API_URL}/metrics?startAt=${startAt}&endAt=${endAt}&unit=day&type=url`, {
			headers: {
				Authorization: `Bearer ${env.TASTY_API_KEY}`
			},
			signal: controller.signal
		}).finally(() => {
			clearTimeout(timeoutId)
		})

		if (!response.ok) {
			throw new Error(`Tasty metrics request failed with ${response.status}: ${await response.text()}`)
		}

		const rows = (await response.json()) as Array<{ x: string; y: number }>
		const tastyMetrics: Record<string, number> = {}
		const trendingRoutes: Array<[string, number]> = []
		let index = 0

		for (const row of rows) {
			if (index <= 20) {
				trendingRoutes.push([row.x, row.y])
			}
			tastyMetrics[row.x] = row.y
			index += 1
		}

		return { tastyMetrics, trendingRoutes }
	} catch (error) {
		logger.log('Error fetching tasty metrics', error)
		return emptyTastyMetrics()
	}
}
