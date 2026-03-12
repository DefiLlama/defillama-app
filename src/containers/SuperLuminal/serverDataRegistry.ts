type Fetcher = () => Promise<Record<string, unknown>>

const SERVER_DATA_FETCHERS: Record<string, Fetcher> = {
	t62luatlj9thwx2: () =>
		import('./dashboards/berachain/api').then((m) =>
			m.fetchBerachainIncomeServerData().then((d) => ({ berachainIncome: d }))
		)
}

export async function fetchCustomServerData(dashboardId: string): Promise<Record<string, unknown>> {
	const fetcher = SERVER_DATA_FETCHERS[dashboardId]
	if (!fetcher) return {}
	try {
		return await fetcher()
	} catch {
		return {}
	}
}
