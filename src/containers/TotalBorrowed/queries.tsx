import { CHART_API, PROTOCOLS_API } from '~/constants'
import { fetchWithErrorLogging, postRuntimeLogs } from '~/utils/async'
import { ILiteChart, ILiteProtocol } from '../ChainOverview/types'
import { oldBlue } from '~/constants/colors'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { getPercentChange, slug } from '~/utils'

export interface ITotalBorrowedByChainPageData {
	protocols: ILiteProtocol[]
	chain: string
	chains: Array<{ label: string; to: string }>
	charts: ILineAndBarChartProps['charts']
	totalBorrowed: number
	change24h: number | null
}

export async function getTotalBorrowedByChain({
	chain
}: {
	chain: string
}): Promise<ITotalBorrowedByChainPageData | null> {
	const [{ protocols, chains }, chart]: [
		{ protocols: Array<ILiteProtocol>; chains: Array<string> },
		Array<[number, number]>
	] = await Promise.all([
		fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		fetchWithErrorLogging(`${CHART_API}${chain && chain !== 'All' ? `/${chain}` : ''}`)
			.then((res) => res.json())
			.then((data: ILiteChart) => data?.borrowed?.map((item) => [+item[0] * 1e3, item[1]]) ?? [])
			.catch((err) => {
				postRuntimeLogs(`Total Borrowed by Chain: ${chain}: ${err instanceof Error ? err.message : err}`)
				return null
			})
	])

	if (!chart || chart.length === 0) return null

	return {
		protocols,
		chain,
		chains: [
			{ label: 'All', to: '/total-borrowed' },
			...chains.map((chain) => ({ label: chain, to: `/total-borrowed/chain/${slug(chain)}` }))
		],
		charts: {
			'Total Borrowed': { name: 'Total Borrowed', data: chart, type: 'line', stack: 'Total Borrowed', color: oldBlue }
		},
		totalBorrowed: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null
	}
}
